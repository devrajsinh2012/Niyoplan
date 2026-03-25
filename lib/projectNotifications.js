import { supabaseAdmin } from '@/lib/supabaseServer';

const ADMIN_PM_ROLES = new Set(['admin', 'pm']);
const MEMBER_VIEWER_ROLES = new Set(['member', 'viewer']);

async function getActorName(actorId) {
  if (!actorId) return 'Niyoplan';

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', actorId)
    .single();

  return data?.full_name || 'Niyoplan';
}

async function getProjectAudienceUserIds(projectId) {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('organization_id, created_by')
    .eq('id', projectId)
    .single();

  const userIds = new Set();

  if (project?.organization_id) {
    const { data: orgMembers } = await supabaseAdmin
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', project.organization_id)
      .eq('status', 'active');

    (orgMembers || []).forEach((member) => {
      if (member?.user_id) userIds.add(member.user_id);
    });
  } else {
    if (project?.created_by) userIds.add(project.created_by);

    const { data: cards } = await supabaseAdmin
      .from('cards')
      .select('reporter_id, assignee_id')
      .eq('project_id', projectId)
      .limit(1000);

    (cards || []).forEach((card) => {
      if (card?.reporter_id) userIds.add(card.reporter_id);
      if (card?.assignee_id) userIds.add(card.assignee_id);
    });
  }

  return [...userIds];
}

export async function createProjectMajorNotifications({
  projectId,
  actorId,
  type,
  title,
  message,
  metadata = {},
  includeMemberViewer = true,
}) {
  try {
    if (!projectId || !type || !title) return;

    const audienceUserIds = await getProjectAudienceUserIds(projectId);
    if (!audienceUserIds.length) return;

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .in('id', audienceUserIds);

    if (!profiles?.length) return;

    const actorName = await getActorName(actorId);

    const recipientIds = profiles
      .filter((profile) => profile.id !== actorId)
      .filter((profile) => {
        if (ADMIN_PM_ROLES.has(profile.role)) return true;
        if (includeMemberViewer && MEMBER_VIEWER_ROLES.has(profile.role)) return true;
        return false;
      })
      .map((profile) => profile.id);

    if (!recipientIds.length) return;

    const rows = recipientIds.map((userId) => ({
      project_id: projectId,
      user_id: userId,
      type,
      title,
      message,
      metadata: {
        ...metadata,
        actor_id: actorId,
        actor_name: actorName,
      },
    }));

    const { error } = await supabaseAdmin.from('notifications').insert(rows);
    if (error) {
      console.error('Failed to create project notifications:', error);
    }
  } catch (error) {
    // Notifications are non-blocking side effects, so failures are logged only.
    console.error('Project notification fan-out failed:', error);
  }
}
