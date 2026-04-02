import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { verifyOrganizationAccess, verifyProjectAccess } from '@/lib/access';
import { supabaseAdmin } from '@/lib/supabaseServer';
import {
  createDriveFolder,
  getOrgRootFolderId,
  uploadFileToDrive,
} from '@/lib/drive';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

async function resolveProject(projectId) {
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('id, organization_id, drive_folder_id, name')
    .eq('id', projectId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve project for attachment upload.');
  }

  return data;
}

async function resolveCard(cardId) {
  const { data, error } = await supabaseAdmin
    .from('cards')
    .select('id, project_id')
    .eq('id', cardId)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve card for attachment upload.');
  }

  return data;
}

async function findExistingCardFolder(cardId) {
  const { data } = await supabaseAdmin
    .from('file_attachments')
    .select('drive_folder_id')
    .eq('card_id', cardId)
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.drive_folder_id || null;
}

export async function POST(request) {
  const { user, error: authError } = await getAuthUser(request);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    const file = formData.get('file');
    const orgIdInput = String(formData.get('orgId') || '').trim();
    const projectId = String(formData.get('projectId') || '').trim();
    const cardId = String(formData.get('cardId') || '').trim();

    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'A file is required.' }, { status: 400 });
    }

    if (!projectId && !orgIdInput) {
      return NextResponse.json({ error: 'projectId or orgId is required.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'File too large (max 25MB).' }, { status: 413 });
    }

    let project = null;
    let resolvedOrgId = orgIdInput || null;

    if (projectId) {
      const projectAccess = await verifyProjectAccess(projectId, user.id);
      if (!projectAccess.hasAccess) {
        return NextResponse.json({ error: projectAccess.error || 'Forbidden.' }, { status: 403 });
      }

      project = await resolveProject(projectId);
      if (!project) {
        return NextResponse.json({ error: 'Project not found.' }, { status: 404 });
      }

      resolvedOrgId = project.organization_id;

      if (orgIdInput && orgIdInput !== resolvedOrgId) {
        return NextResponse.json({ error: 'orgId does not match project organization.' }, { status: 400 });
      }
    } else {
      const orgAccess = await verifyOrganizationAccess(resolvedOrgId, user.id);
      if (!orgAccess.hasAccess) {
        return NextResponse.json({ error: orgAccess.error || 'Forbidden.' }, { status: 403 });
      }
    }

    if (!resolvedOrgId) {
      return NextResponse.json({ error: 'Unable to resolve organization for this upload.' }, { status: 400 });
    }

    let normalizedCardId = null;
    if (cardId) {
      const card = await resolveCard(cardId);
      if (!card) {
        return NextResponse.json({ error: 'Card not found.' }, { status: 404 });
      }

      if (projectId && card.project_id !== projectId) {
        return NextResponse.json({ error: 'Card does not belong to the requested project.' }, { status: 400 });
      }

      const projectAccess = await verifyProjectAccess(card.project_id, user.id);
      if (!projectAccess.hasAccess) {
        return NextResponse.json({ error: projectAccess.error || 'Forbidden.' }, { status: 403 });
      }

      normalizedCardId = card.id;
    }

    const rootFolderId = await getOrgRootFolderId(resolvedOrgId);
    if (!rootFolderId) {
      return NextResponse.json(
        {
          error: 'Google Drive is not connected for this organization. Ask your admin to connect it in Company Settings.',
        },
        { status: 400 }
      );
    }

    let targetFolderId = rootFolderId;

    if (project) {
      if (project.drive_folder_id) {
        targetFolderId = project.drive_folder_id;
      } else {
        const projectFolderId = await createDriveFolder(
          resolvedOrgId,
          project.name || `project-${project.id}`,
          rootFolderId
        );

        if (projectFolderId) {
          targetFolderId = projectFolderId;
          await supabaseAdmin
            .from('projects')
            .update({ drive_folder_id: projectFolderId })
            .eq('id', project.id);
        }
      }
    }

    if (normalizedCardId) {
      const existingCardFolder = await findExistingCardFolder(normalizedCardId);
      if (existingCardFolder) {
        targetFolderId = existingCardFolder;
      } else {
        const cardFolderId = await createDriveFolder(
          resolvedOrgId,
          `card-${normalizedCardId}`,
          targetFolderId
        );

        if (cardFolderId) {
          targetFolderId = cardFolderId;
        }
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const uploadResult = await uploadFileToDrive(
      resolvedOrgId,
      targetFolderId,
      file.name,
      file.type || 'application/octet-stream',
      buffer
    );

    const { data: attachment, error: insertError } = await supabaseAdmin
      .from('file_attachments')
      .insert({
        org_id: resolvedOrgId,
        project_id: project?.id || projectId || null,
        card_id: normalizedCardId,
        drive_file_id: uploadResult.driveFileId,
        drive_folder_id: targetFolderId,
        original_name: file.name,
        mime_type: file.type || null,
        size_bytes: uploadResult.size ?? file.size ?? null,
        uploaded_by: user.id,
      })
      .select('*')
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, attachment });
  } catch (error) {
    console.error('File upload failed:', error);
    return NextResponse.json({ error: 'Unable to upload file right now. Please try again.' }, { status: 500 });
  }
}
