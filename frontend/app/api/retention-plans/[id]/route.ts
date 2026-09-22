import { NextRequest, NextResponse } from 'next/server';

// Temporary in-memory storage for demo purposes
// In production, this would be replaced with proper database
const retentionPlans = new Map<string, Record<string, unknown>>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Add Firebase Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const plan = retentionPlans.get(id);
    
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    return NextResponse.json(plan);

  } catch (error) {
    console.error('Error fetching retention plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention plan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Add Firebase Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const body = await request.json();
    const existingPlan = retentionPlans.get(id);
    
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Update the plan
    const updatedPlan = {
      ...existingPlan,
      ...body,
      updated_at: new Date().toISOString()
    };

    retentionPlans.set(id, updatedPlan);

    return NextResponse.json({
      success: true,
      message: 'Plan updated successfully',
      plan: updatedPlan
    });

  } catch (error) {
    console.error('Error updating retention plan:', error);
    return NextResponse.json(
      { error: 'Failed to update retention plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // TODO: Add Firebase Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const existingPlan = retentionPlans.get(id);
    
    if (!existingPlan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Soft delete - mark as archived
    const archivedPlan = {
      ...existingPlan,
      status: 'archived',
      updated_at: new Date().toISOString()
    };

    retentionPlans.set(id, archivedPlan);

    return NextResponse.json({
      success: true,
      message: 'Plan archived successfully'
    });

  } catch (error) {
    console.error('Error archiving retention plan:', error);
    return NextResponse.json(
      { error: 'Failed to archive retention plan' },
      { status: 500 }
    );
  }
}