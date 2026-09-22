import { NextRequest, NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase/admin';
import { creationTime } from '@/lib/utils/creation-time';

// Firestore collections
const RETENTION_PLANS_COLLECTION = 'retention_plans';

export async function GET(request: NextRequest) {
  try {
    // TODO: Add Firebase Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const customerId = url.searchParams.get('customer_id');
    
    if (!userId) {
      return NextResponse.json({ error: 'userId parameter required' }, { status: 400 });
    }

    // Get Firestore instance
    const adminApp = getAdminApp();
    const db = adminApp.firestore();
    const plansRef = db.collection(RETENTION_PLANS_COLLECTION);

    // Build query
    let query = plansRef.where('user_id', '==', userId);

    // Add filters
    if (status && status !== 'all') {
      query = query.where('status', '==', status);
    }
    if (customerId) {
      query = query.where('customer_id', '==', customerId);
    }

    // Execute query without ordering (to avoid index requirement)
    // We'll sort in memory instead
    const snapshot = await query.get();
    
    const plans = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, created_at: data.created_at };
    }).sort((a, b) => {
      // Sort by created_at desc (most recent first)
      return creationTime(b.created_at) - creationTime(a.created_at);
    });

    return NextResponse.json({
      plans,
      total: plans.length
    });

  } catch (error) {
    console.error('Error fetching retention plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retention plans' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add Firebase Auth verification
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const body = await request.json();
    const { plan_data, user_id, name, customer_id } = body;

    if (!plan_data || !user_id) {
      return NextResponse.json(
        { error: 'plan_data and user_id are required' },
        { status: 400 }
      );
    }

    // Ensure plan has an ID
    if (!plan_data.plan_id) {
      plan_data.plan_id = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Get Firestore instance
    const adminApp = getAdminApp();
    const db = adminApp.firestore();

    // Extract customer_id from multiple possible sources
    const extractedCustomerId = customer_id || 
                               plan_data.customer_id || 
                               plan_data.target?.id || 
                               plan_data.target?.customer_id ||
                               '';

    const planRecord = {
      id: plan_data.plan_id,
      user_id,
      customer_id: extractedCustomerId,
      name: name || plan_data.template?.name || plan_data.name || `Retention Plan ${new Date().toLocaleDateString('de-DE')}`,
      status: 'active',
      plan_data: plan_data,
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('Saving plan record:', JSON.stringify(planRecord, null, 2));

    // Save to Firestore with generated or provided ID
    await db.collection(RETENTION_PLANS_COLLECTION).doc(plan_data.plan_id).set(planRecord);

    return NextResponse.json({
      success: true,
      plan_id: plan_data.plan_id,
      message: 'Retention plan saved successfully'
    });

  } catch (error) {
    console.error('Error saving retention plan:', error);
    return NextResponse.json(
      { error: 'Failed to save retention plan' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const planId = url.searchParams.get('id');
    const bulkIds = url.searchParams.get('bulk_ids');

    if (!planId && !bulkIds) {
      return NextResponse.json({ error: 'Plan ID or bulk_ids required' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const db = adminApp.firestore();

    if (bulkIds) {
      // Bulk delete
      const ids = bulkIds.split(',');
      const batch = db.batch();
      
      ids.forEach(id => {
        const docRef = db.collection(RETENTION_PLANS_COLLECTION).doc(id);
        batch.delete(docRef);
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        message: `${ids.length} plans deleted successfully`
      });
    } else {
      // Single delete
      await db.collection(RETENTION_PLANS_COLLECTION).doc(planId!).delete();

      return NextResponse.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting retention plan(s):', error);
    return NextResponse.json(
      { error: 'Failed to delete retention plan(s)' },
      { status: 500 }
    );
  }
}
