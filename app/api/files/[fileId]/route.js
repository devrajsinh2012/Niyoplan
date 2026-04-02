import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { deleteFileFromDrive, getDriveFileDownloadUrl } from '@/lib/drive';

async function canDeleteAttachment(fileRecord, userId) {
  if (fileRecord.uploaded_by === userId) {
    return true;
  }

  const { data: membership, error } = await supabaseAdmin
    .from('organization_members')
    .select('role, status')
    .eq('organization_id', fileRecord.org_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;

  return Boolean(
    membership &&
      membership.status === 'active' &&
      (membership.role === 'admin' || membership.role === 'pm')
  );
}

async function hasOrgAccess(orgId, userId) {
  const { data, error } = await supabaseAdmin
    .from('organization_members')
    .select('id, status')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return false;
  return Boolean(data && data.status === 'active');
}

export async function GET(request, { params }) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileId } = await params;

    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError) throw fileError;

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const hasAccess = await hasOrgAccess(fileRecord.org_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const urls = await getDriveFileDownloadUrl(fileRecord.org_id, fileRecord.drive_file_id);

    return NextResponse.json({
      ...urls,
      fileName: fileRecord.original_name,
    });
  } catch (error) {
    console.error('Get file URL failed:', error);
    return NextResponse.json({ error: 'Unable to generate file link right now.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { fileId } = await params;

    const { data: fileRecord, error: fileError } = await supabaseAdmin
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .maybeSingle();

    if (fileError) throw fileError;

    if (!fileRecord) {
      return NextResponse.json({ error: 'File not found.' }, { status: 404 });
    }

    const hasAccess = await hasOrgAccess(fileRecord.org_id, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });
    }

    const canDelete = await canDeleteAttachment(fileRecord, user.id);
    if (!canDelete) {
      return NextResponse.json({ error: 'Only the uploader, admin, or PM can delete this file.' }, { status: 403 });
    }

    await deleteFileFromDrive(fileRecord.org_id, fileRecord.drive_file_id);

    const { error: deleteError } = await supabaseAdmin
      .from('file_attachments')
      .delete()
      .eq('id', fileRecord.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete file failed:', error);
    return NextResponse.json({ error: 'Unable to delete this file right now.' }, { status: 500 });
  }
}
