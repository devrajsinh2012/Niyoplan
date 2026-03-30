import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { verifyProjectAccess } from '@/lib/access';

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access before fetching comments
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const { data: comments, error } = await supabaseAdmin
      .from('card_comments')
      .select('*, user:profiles!card_comments_user_id_fkey(id, full_name, avatar_url)')
      .eq('card_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json(comments || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error: authError } = await getAuthUser(request);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify project access before creating comment
    const { data: card } = await supabaseAdmin
      .from('cards')
      .select('project_id, title, custom_id, assignee_id, reporter_id')
      .eq('id', id)
      .single();
      
    if (!card) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
    const access = await verifyProjectAccess(card.project_id, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
      .from('card_comments')
      .insert([
        {
          card_id: id,
          user_id: user.id,
          content: content.trim()
        }
      ])
      .select('*, user:profiles!card_comments_user_id_fkey(id, full_name, avatar_url)')
      .single();

    if (error) throw error;

    // Notify relevant people about the new comment
    const notifyUsers = new Set();
    const cardRef = card.custom_id || card.title;

    // Notify card assignee if different from comment author
    if (card.assignee_id && card.assignee_id !== user.id) {
      notifyUsers.add(card.assignee_id);
    }
    // Notify card reporter if different from comment author
    if (card.reporter_id && card.reporter_id !== user.id) {
      notifyUsers.add(card.reporter_id);
    }

    // Notify mentioned users (simple @mention detection)
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const mentions = content.match(mentionRegex);
    if (mentions) {
      const mentionNames = mentions.map(m => m.slice(1).toLowerCase());
      const { data: mentionedUsers } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .in('full_name', mentionNames)
        .limit(5);

      (mentionedUsers || []).forEach(u => {
        if (u.id !== user.id) notifyUsers.add(u.id);
      });
    }

    if (notifyUsers.size > 0) {
      const notifications = [...notifyUsers].map(userId => ({
        project_id: card.project_id,
        user_id: userId,
        type: 'comment_added',
        title: 'New comment',
        message: `commented on ${cardRef}`,
        metadata: {
          card_id: id,
          card_title: card.title,
          card_custom_id: card.custom_id || null,
          comment_id: comment.id,
          comment_preview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          actor_id: user.id,
          actor_name: user.full_name || 'Team Member',
        },
      }));
      await supabaseAdmin.from('notifications').insert(notifications);
    }

    // Log the comment
    await supabaseAdmin.from('activity_log').insert({
      card_id: id,
      user_id: user.id,
      action: 'commented',
      details: { comment_id: comment.id }
    });

    return NextResponse.json(comment);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
