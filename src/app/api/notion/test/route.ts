import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, databaseId } = await req.json();

    if (!apiKey || !databaseId) {
      return NextResponse.json(
        { error: 'Notion API key and Database ID are required.' },
        { status: 400 }
      );
    }

    // Clean database ID (strip dashes or full URL if pasted)
    let cleanDbId = databaseId.trim();
    if (cleanDbId.includes('notion.so/')) {
      const parts = cleanDbId.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0];
      cleanDbId = lastPart.replace(/-/g, '');
    } else {
      cleanDbId = cleanDbId.replace(/-/g, '');
    }

    // Support instant demo mode for local preview / evaluation
    if (apiKey === 'demo' || apiKey.startsWith('demo_')) {
      return NextResponse.json({
        success: true,
        title: 'College Tasks & Assignments (Demo DB)',
        databaseId: cleanDbId,
        properties: ['Name', 'Subject', 'Due Date', 'Priority', 'Status'],
        isDemo: true,
      });
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { 
          error: data.message || 'Failed to connect to Notion database. Please verify your token and database share permissions.' 
        },
        { status: response.status }
      );
    }

    const title = data.title?.[0]?.plain_text || 'Untitled Notion Database';
    const propertyNames = Object.keys(data.properties || {});

    return NextResponse.json({
      success: true,
      title,
      databaseId: cleanDbId,
      properties: propertyNames,
      isDemo: false,
    });
  } catch (error: any) {
    console.error('Notion test connection error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error while connecting to Notion.' },
      { status: 500 }
    );
  }
}
