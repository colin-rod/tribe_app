import { NextRequest, NextResponse } from 'next/server'

/**
 * Simple test webhook to verify basic functionality
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const data: Record<string, any> = {}
    
    for (const [key, value] of formData.entries()) {
      data[key] = value
    }

    return NextResponse.json({
      success: true,
      message: 'Test webhook working',
      receivedData: data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test webhook failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}