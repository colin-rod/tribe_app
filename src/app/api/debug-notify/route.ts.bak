import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createUnassignedLeaf } from '@/lib/leaf-assignments'

/**
 * Debug version of notify webhook to see exact error
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    // Step 1: Test service client creation
    let supabase
    try {
      supabase = createServiceClient()
      console.log('✅ Service client created successfully')
    } catch (error) {
      console.error('❌ Service client failed:', error)
      return NextResponse.json({ 
        error: 'Service client failed', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    // Step 2: Test user lookup
    const recipient = formData.get('recipient') as string
    const userId = recipient?.replace('u-', '').split('@')[0]
    
    console.log('🔍 Looking up user:', userId)
    
    try {
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('id', userId)
        .single()
      
      if (userError) {
        console.error('❌ User lookup failed:', userError)
        return NextResponse.json({ 
          error: 'User lookup failed', 
          details: userError 
        }, { status: 500 })
      }
      
      console.log('✅ User found:', user.id)
    } catch (error) {
      console.error('❌ User lookup exception:', error)
      return NextResponse.json({ 
        error: 'User lookup exception', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

    // Step 3: Test createUnassignedLeaf
    try {
      console.log('🍃 Testing createUnassignedLeaf...')
      const leaf = await createUnassignedLeaf({
        author_id: userId,
        leaf_type: 'text',
        content: 'Debug test leaf',
        tags: [],
        ai_caption: 'Debug test'
      }, supabase)
      
      if (!leaf) {
        console.error('❌ createUnassignedLeaf returned null')
        return NextResponse.json({ 
          error: 'createUnassignedLeaf returned null' 
        }, { status: 500 })
      }
      
      console.log('✅ Leaf created successfully:', leaf.id)
      
      return NextResponse.json({
        success: true,
        message: 'Debug webhook completed successfully',
        leafId: leaf.id,
        userId: userId
      })
      
    } catch (error) {
      console.error('❌ createUnassignedLeaf failed:', error)
      return NextResponse.json({ 
        error: 'createUnassignedLeaf failed', 
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Top-level error:', error)
    return NextResponse.json({ 
      error: 'Top-level error', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}