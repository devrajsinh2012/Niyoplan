import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseServer';
import { getAuthUser } from '@/lib/auth';
import { checkRole } from '@/lib/roles';

const VALID_DEPENDENCY_TYPES = ['finish_start', 'finish_finish', 'start_start', 'start_finish'];

/**
 * Validates dependency constraints
 * - No self-links
 * - No circular dependencies
 * - No invalid date ordering (for finish_start)
 */
async function validateDependency(projectId, sourceId, targetId, type = 'finish_start') {
  // Validate self-link
  if (sourceId === targetId) {
    throw new Error('Cannot create dependency from task to itself');
  }

  // Validate both cards exist and belong to project
  const { data: cards, error: cardsErr } = await supabaseAdmin
    .from('cards')
    .select('id, start_date, due_date')
    .in('id', [sourceId, targetId])
    .eq('project_id', projectId);

  if (cardsErr || !cards || cards.length !== 2) {
    throw new Error('One or both referenced cards do not exist or do not belong to this project');
  }

  const sourceCard = cards.find(c => c.id === sourceId);
  const targetCard = cards.find(c => c.id === targetId);

  // For finish_start, validate date order if both have dates
  if (type === 'finish_start' && sourceCard?.due_date && targetCard?.start_date) {
    const sourceEnd = new Date(sourceCard.due_date);
    const targetStart = new Date(targetCard.start_date);
    if (sourceEnd > targetStart) {
      throw new Error(`Date conflict: source task ends after target task starts (${sourceEnd} > ${targetStart})`);
    }
  }

  // Check for circular dependency (simplified BFS)
  const { data: existingDeps } = await supabaseAdmin
    .from('card_dependencies')
    .select('predecessor_id, successor_id')
    .eq('project_id', projectId);

  if (existingDeps && existingDeps.length > 0) {
    // Check if targetId can reach sourceId (would create a cycle)
    const graph = {};
    existingDeps.forEach(dep => {
      if (!graph[dep.successor_id]) graph[dep.successor_id] = [];
      graph[dep.successor_id].push(dep.predecessor_id);
    });

    const visited = new Set();
    const canReach = (node, target) => {
      if (node === target) return true;
      if (visited.has(node)) return false;
      visited.add(node);
      const neighbors = graph[node] || [];
      return neighbors.some(n => canReach(n, target));
    };

    if (canReach(targetId, sourceId)) {
      throw new Error('Creating this dependency would result in a circular dependency');
    }
  }
}

export async function GET(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: dependencies, error: fetchError } = await supabaseAdmin
      .from('card_dependencies')
      .select(`
        id, project_id, predecessor_id, successor_id,
        type, lead_or_lag_days, created_by, created_at
      `)
      .eq('project_id', projectId);

    if (fetchError) throw fetchError;
    return NextResponse.json(dependencies || []);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { projectId } = await params;
  const { user, error } = await getAuthUser(request);
  if (error || !user) {
    return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
  }

  if (!checkRole(user, 'admin', 'pm', 'member')) {
    return NextResponse.json({ error: 'Forbidden. Insufficient role.' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { predecessor_id, successor_id, type = 'finish_start', lead_or_lag_days = 0 } = body;

    // Validate inputs
    if (!predecessor_id || !successor_id) {
      return NextResponse.json({ error: 'predecessor_id and successor_id are required' }, { status: 400 });
    }

    if (!VALID_DEPENDENCY_TYPES.includes(type)) {
      return NextResponse.json({ 
        error: `Invalid dependency type. Must be one of: ${VALID_DEPENDENCY_TYPES.join(', ')}` 
      }, { status: 400 });
    }

    if (typeof lead_or_lag_days !== 'number' || lead_or_lag_days < -365 || lead_or_lag_days > 365) {
      return NextResponse.json({ error: 'lead_or_lag_days must be between -365 and 365' }, { status: 400 });
    }

    // Validate dependency constraints
    await validateDependency(projectId, predecessor_id, successor_id, type);

    // Insert dependency
    const { data: dependency, error: insertError } = await supabaseAdmin
      .from('card_dependencies')
      .insert([{
        project_id: projectId,
        predecessor_id,
        successor_id,
        type,
        lead_or_lag_days,
        created_by: user.id,
      }])
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'Dependency between these cards already exists' }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json(dependency, { status: 201 });
  } catch (err) {
    console.error('Dependency POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
