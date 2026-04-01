import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var: ${key}`);
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const ownerEmail = String(process.env.SEED_OWNER_EMAIL || 'djgohil2012@gmail.com').trim().toLowerCase();
const ownerPassword = String(process.env.SEED_OWNER_PASSWORD || '123456789');

const COMPANY_NAME = 'Microsoft';
const COMPANY_SLUG_BASE = 'microsoft';
const COMPANY_INDUSTRY = 'Software';
const COMPANY_SIZE = '200+';
const ISSUES_PER_PROJECT = 24;

const CORE_STATUS_LISTS = [
  { status: 'backlog', name: 'BACKLOG', rank: 1000 },
  { status: 'todo', name: 'TO DO', rank: 2000 },
  { status: 'in_progress', name: 'IN PROGRESS', rank: 3000 },
  { status: 'in_review', name: 'IN REVIEW', rank: 4000 },
  { status: 'done', name: 'DONE', rank: 5000 },
];

const PROJECT_SEEDS = [
  {
    name: 'Azure Cost Guardian',
    description: 'Optimize cloud spend forecasting, anomaly detection, and budget guardrails.',
    basePrefix: 'AZCG',
  },
  {
    name: 'Teams Collaboration Insights',
    description: 'Track message quality, async collaboration metrics, and engagement trends.',
    basePrefix: 'TCIN',
  },
  {
    name: 'Office Workflow Automation',
    description: 'Automate document lifecycle, approval flows, and review reminders.',
    basePrefix: 'OWFA',
  },
  {
    name: 'Defender Threat Triage',
    description: 'Accelerate security triage and reduce alert fatigue for SOC teams.',
    basePrefix: 'DETT',
  },
  {
    name: 'Dynamics Pipeline Studio',
    description: 'Improve CRM pipeline reliability and forecasting accuracy for enterprise sales.',
    basePrefix: 'DYPS',
  },
  {
    name: 'Xbox Matchmaking Reliability',
    description: 'Reduce queue latency and improve session stability across regions.',
    basePrefix: 'XBMR',
  },
  {
    name: 'Edge Performance Radar',
    description: 'Measure startup, rendering, and memory behavior with actionable diagnostics.',
    basePrefix: 'EDPR',
  },
  {
    name: 'Copilot Prompt Evaluation Lab',
    description: 'Benchmark prompt quality and response safety for AI assistant workflows.',
    basePrefix: 'CPEL',
  },
];

const MEMBER_SEEDS = [
  { key: 'owner', email: ownerEmail, fullName: 'Devrajsinh Gohil', role: 'admin', password: ownerPassword },
  { key: 'admin2', email: 'microsoft.admin.seed@niyoplan.test', fullName: 'MS Admin Seed', role: 'admin', password: 'SeedPass@123' },
  { key: 'pm1', email: 'microsoft.pm1.seed@niyoplan.test', fullName: 'MS PM One', role: 'pm', password: 'SeedPass@123' },
  { key: 'pm2', email: 'microsoft.pm2.seed@niyoplan.test', fullName: 'MS PM Two', role: 'pm', password: 'SeedPass@123' },
  { key: 'qa1', email: 'microsoft.qa1.seed@niyoplan.test', fullName: 'MS QA One', role: 'qa', password: 'SeedPass@123' },
  { key: 'qa2', email: 'microsoft.qa2.seed@niyoplan.test', fullName: 'MS QA Two', role: 'qa', password: 'SeedPass@123' },
  { key: 'dev1', email: 'microsoft.dev1.seed@niyoplan.test', fullName: 'MS Developer One', role: 'developer', password: 'SeedPass@123' },
  { key: 'dev2', email: 'microsoft.dev2.seed@niyoplan.test', fullName: 'MS Developer Two', role: 'developer', password: 'SeedPass@123' },
  { key: 'dev3', email: 'microsoft.dev3.seed@niyoplan.test', fullName: 'MS Developer Three', role: 'developer', password: 'SeedPass@123' },
  { key: 'member1', email: 'microsoft.member1.seed@niyoplan.test', fullName: 'MS Member One', role: 'member', password: 'SeedPass@123' },
  { key: 'member2', email: 'microsoft.member2.seed@niyoplan.test', fullName: 'MS Member Two', role: 'member', password: 'SeedPass@123' },
  { key: 'viewer1', email: 'microsoft.viewer1.seed@niyoplan.test', fullName: 'MS Viewer One', role: 'viewer', password: 'SeedPass@123' },
];

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

function addDaysIso(daysOffset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysOffset);
  return d.toISOString();
}

function listStatusKey(name) {
  const normalized = String(name || '').trim().toLowerCase();
  if (normalized === 'done' || normalized === 'completed' || normalized === 'resolved' || normalized === 'finished') return 'done';
  if (normalized === 'in review' || normalized === 'review' || normalized === 'testing' || normalized === 'qa') return 'in_review';
  if (normalized === 'in progress' || normalized === 'progress' || normalized === 'doing' || normalized === 'active') return 'in_progress';
  if (normalized === 'to do' || normalized === 'todo' || normalized === 'to-do' || normalized === 'upcoming') return 'todo';
  if (normalized === 'backlog') return 'backlog';
  return `custom:${normalized}`;
}

function statusByIssueIndex(index) {
  if (index < 6) return 'backlog';
  if (index < 12) return 'todo';
  if (index < 17) return 'in_progress';
  if (index < 21) return 'in_review';
  return 'done';
}

function issueTypeByIndex(index) {
  if (index % 12 === 0) return 'epic';
  if (index % 5 === 0) return 'bug';
  if (index % 3 === 0) return 'story';
  return 'task';
}

function priorityByIndex(index) {
  if (index % 10 === 0) return 'urgent';
  if (index % 4 === 0) return 'high';
  if (index % 3 === 0) return 'low';
  return 'medium';
}

function dateWindowByStatus(status, index) {
  if (status === 'done') {
    const startOffset = -55 + index;
    return { start: addDaysIso(startOffset), due: addDaysIso(startOffset + 12) };
  }

  if (status === 'in_review') {
    const startOffset = -16 + index;
    return { start: addDaysIso(startOffset), due: addDaysIso(startOffset + 6) };
  }

  if (status === 'in_progress') {
    const startOffset = -8 + index;
    return { start: addDaysIso(startOffset), due: addDaysIso(startOffset + 10) };
  }

  if (status === 'todo') {
    const startOffset = 2 + index;
    return { start: addDaysIso(startOffset), due: addDaysIso(startOffset + 9) };
  }

  const startOffset = 9 + index;
  return { start: addDaysIso(startOffset), due: addDaysIso(startOffset + 14) };
}

async function findAuthUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const match = users.find((candidate) => String(candidate.email || '').toLowerCase() === email);
    if (match) return match;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureAuthUser(seed) {
  const normalizedEmail = String(seed.email || '').trim().toLowerCase();
  let authUser = await findAuthUserByEmail(normalizedEmail);

  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password: seed.password,
      email_confirm: true,
      user_metadata: {
        full_name: seed.fullName,
        role: seed.role,
      },
    });

    if (error) throw error;
    authUser = data?.user || null;
  }

  if (!authUser?.id) {
    throw new Error(`Unable to resolve auth user for ${normalizedEmail}`);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .upsert(
      {
        id: authUser.id,
        full_name: seed.fullName,
        role: seed.role,
      },
      { onConflict: 'id' }
    );

  if (profileError) throw profileError;

  return authUser;
}

async function getUniqueSlug(baseSlug) {
  for (let i = 0; i < 100; i += 1) {
    const suffix = i === 0 ? '' : `-${i + 1}`;
    const candidate = `${baseSlug}${suffix}`.slice(0, 100);

    const { data, error } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  throw new Error('Unable to generate unique company slug');
}

async function getUniquePrefix(basePrefix) {
  const cleaned = String(basePrefix || 'MSFT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'MSFT';

  for (let i = 0; i < 200; i += 1) {
    const suffix = i === 0 ? '' : String(i + 1);
    const candidate = `${cleaned}${suffix}`.slice(0, 10);

    const { data, error } = await admin
      .from('projects')
      .select('id')
      .eq('prefix', candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;
  }

  throw new Error(`Unable to create unique prefix for ${basePrefix}`);
}

async function ensureOrganization(ownerId) {
  const { data: existingByName, error: existingError } = await admin
    .from('organizations')
    .select('*')
    .eq('name', COMPANY_NAME)
    .order('created_at', { ascending: true });

  if (existingError) throw existingError;

  if (Array.isArray(existingByName) && existingByName.length > 0) {
    return existingByName[0];
  }

  const slug = await getUniqueSlug(COMPANY_SLUG_BASE);
  const { data, error } = await admin
    .from('organizations')
    .insert({
      name: COMPANY_NAME,
      slug,
      industry: COMPANY_INDUSTRY,
      size: COMPANY_SIZE,
      created_by: ownerId,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

async function ensureCoreLists(projectId) {
  const { data: existingLists, error } = await admin
    .from('lists')
    .select('id, name, rank, created_at')
    .eq('project_id', projectId)
    .order('rank', { ascending: true });

  if (error) throw error;

  let lists = existingLists || [];

  const existingByStatus = new Map();
  for (const list of lists) {
    const status = listStatusKey(list.name);
    if (status.startsWith('custom:')) continue;
    if (!existingByStatus.has(status)) {
      existingByStatus.set(status, list);
    }
  }

  const missing = CORE_STATUS_LISTS.filter((entry) => !existingByStatus.has(entry.status));

  if (missing.length > 0) {
    const { data: created, error: createError } = await admin
      .from('lists')
      .insert(
        missing.map((entry) => ({
          project_id: projectId,
          name: entry.name,
          rank: entry.rank,
        }))
      )
      .select('id, name, rank, created_at');

    if (createError) throw createError;
    lists = [...lists, ...(created || [])];
  }

  const statusListMap = new Map();
  const sorted = [...lists].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  for (const list of sorted) {
    const status = listStatusKey(list.name);
    if (status.startsWith('custom:')) continue;
    if (!statusListMap.has(status)) {
      statusListMap.set(status, list.id);
    }
  }

  return statusListMap;
}

function buildIssueRows(project, listMap, members, ownerId) {
  const assignableMembers = members.filter((member) => member.role !== 'viewer');
  const storyPoints = [1, 2, 3, 5, 8, 13];

  const rows = [];

  for (let i = 0; i < ISSUES_PER_PROJECT; i += 1) {
    const issueNumber = i + 1;
    const status = statusByIssueIndex(i);
    const issueType = issueTypeByIndex(i);
    const priority = priorityByIndex(i);
    const assignee = assignableMembers[i % assignableMembers.length];
    const dateWindow = dateWindowByStatus(status, i);

    rows.push({
      title: `[MS Seed] ${project.prefix} Work Item ${issueNumber}`,
      description: `${project.name} seeded item ${issueNumber} for functional testing across workflows.`,
      issue_type: issueType,
      priority,
      status,
      list_id: listMap.get(status) || listMap.get('backlog') || null,
      story_points: storyPoints[i % storyPoints.length],
      assignee_id: assignee.userId,
      reporter_id: ownerId,
      start_date: dateWindow.start,
      due_date: dateWindow.due,
      rank: issueNumber * 1000,
    });
  }

  return rows;
}

async function upsertProjectIssues(project, issueRows) {
  const titles = issueRows.map((row) => row.title);

  const { data: existingCards, error: existingError } = await admin
    .from('cards')
    .select('id, title, status, list_id, start_date, due_date, assignee_id, rank, priority, issue_type')
    .eq('project_id', project.id)
    .in('title', titles);

  if (existingError) throw existingError;

  const existingMap = new Map((existingCards || []).map((card) => [card.title, card]));

  const inserts = [];
  const updates = [];

  for (const row of issueRows) {
    const existing = existingMap.get(row.title);

    if (!existing) {
      inserts.push({
        project_id: project.id,
        ...row,
      });
      continue;
    }

    const needsUpdate =
      existing.status !== row.status ||
      existing.list_id !== row.list_id ||
      String(existing.assignee_id || '') !== String(row.assignee_id || '') ||
      String(existing.priority || '') !== String(row.priority || '') ||
      String(existing.issue_type || '') !== String(row.issue_type || '') ||
      Number(existing.rank || 0) !== Number(row.rank || 0);

    if (needsUpdate) {
      updates.push({ id: existing.id, payload: row });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await admin.from('cards').insert(inserts);
    if (insertError) throw insertError;
  }

  if (updates.length > 0) {
    await Promise.all(
      updates.map((entry) => {
        return admin
          .from('cards')
          .update(entry.payload)
          .eq('id', entry.id);
      })
    );
  }

  return { inserted: inserts.length, updated: updates.length };
}

async function verifyOwnerCredential() {
  const { error } = await anon.auth.signInWithPassword({
    email: ownerEmail,
    password: ownerPassword,
  });

  if (error) {
    console.log(`[warn] Owner credential verification failed: ${error.message}`);
    return;
  }

  console.log(`[ok] Credential verified for ${ownerEmail}`);
  await anon.auth.signOut();
}

async function main() {
  await verifyOwnerCredential();

  const ownerAuthUser = await findAuthUserByEmail(ownerEmail);
  if (!ownerAuthUser?.id) {
    throw new Error(`Owner user not found in auth.users: ${ownerEmail}`);
  }

  const usersByKey = {};
  const members = [];

  for (const seed of MEMBER_SEEDS) {
    if (seed.key === 'owner') {
      usersByKey.owner = ownerAuthUser;

      const { error: ownerProfileError } = await admin
        .from('profiles')
        .upsert(
          {
            id: ownerAuthUser.id,
            full_name: ownerAuthUser.user_metadata?.full_name || seed.fullName,
            role: 'admin',
          },
          { onConflict: 'id' }
        );

      if (ownerProfileError) throw ownerProfileError;

      members.push({ key: seed.key, userId: ownerAuthUser.id, role: seed.role, email: seed.email });
      continue;
    }

    const authUser = await ensureAuthUser(seed);
    usersByKey[seed.key] = authUser;
    members.push({ key: seed.key, userId: authUser.id, role: seed.role, email: seed.email });
  }

  const organization = await ensureOrganization(ownerAuthUser.id);

  const orgMembershipRows = members.map((member) => ({
    organization_id: organization.id,
    user_id: member.userId,
    role: member.role,
    status: 'active',
  }));

  const { error: orgMembersError } = await admin
    .from('organization_members')
    .upsert(orgMembershipRows, { onConflict: 'user_id,organization_id' });

  if (orgMembersError) throw orgMembersError;

  const projectSummaries = [];
  let totalInsertedIssues = 0;
  let totalUpdatedIssues = 0;

  for (const seed of PROJECT_SEEDS) {
    const { data: existingProject, error: existingProjectError } = await admin
      .from('projects')
      .select('*')
      .eq('organization_id', organization.id)
      .eq('name', seed.name)
      .maybeSingle();

    if (existingProjectError) throw existingProjectError;

    let project = existingProject;
    let projectCreated = false;

    if (!project) {
      const prefix = await getUniquePrefix(seed.basePrefix);
      const { data: createdProject, error: createProjectError } = await admin
        .from('projects')
        .insert({
          name: seed.name,
          description: seed.description,
          prefix,
          organization_id: organization.id,
          created_by: ownerAuthUser.id,
        })
        .select('*')
        .single();

      if (createProjectError) throw createProjectError;
      project = createdProject;
      projectCreated = true;
    }

    const projectMemberRows = members.map((member) => ({
      project_id: project.id,
      user_id: member.userId,
      role: member.role,
    }));

    const { error: projectMemberError } = await admin
      .from('project_members')
      .upsert(projectMemberRows, { onConflict: 'project_id,user_id' });

    if (projectMemberError) throw projectMemberError;

    const listMap = await ensureCoreLists(project.id);
    const issueRows = buildIssueRows(project, listMap, members, ownerAuthUser.id);
    const issueResult = await upsertProjectIssues(project, issueRows);

    totalInsertedIssues += issueResult.inserted;
    totalUpdatedIssues += issueResult.updated;

    const { count: cardCount, error: countError } = await admin
      .from('cards')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project.id);

    if (countError) throw countError;

    projectSummaries.push({
      name: project.name,
      prefix: project.prefix,
      created: projectCreated,
      insertedIssues: issueResult.inserted,
      updatedIssues: issueResult.updated,
      totalIssues: cardCount || 0,
      listCount: listMap.size,
    });
  }

  const { count: orgMemberCount, error: orgCountError } = await admin
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organization.id)
    .eq('status', 'active');

  if (orgCountError) throw orgCountError;

  console.log('\n=== Microsoft Seed Summary ===');
  console.log(
    JSON.stringify(
      {
        ownerEmail,
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          inviteCode: organization.invite_code,
        },
        membersActive: orgMemberCount || 0,
        projectCount: projectSummaries.length,
        issuesInsertedThisRun: totalInsertedIssues,
        issuesUpdatedThisRun: totalUpdatedIssues,
        projects: projectSummaries,
        seededMemberEmails: members.map((member) => member.email),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error('[fatal] Microsoft seed failed:', error?.message || error);
  if (error?.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
