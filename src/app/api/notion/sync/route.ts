import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TaskPayload {
  id?: number | string;
  title: string;
  subject: string;
  dueDate: string;
  priority?: string;
  status?: string;
  description?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, databaseId, tasks } = await req.json();

    if (!apiKey || !databaseId) {
      return NextResponse.json(
        { error: 'Notion API key and Database ID are required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json(
        { error: 'No tasks provided to sync.' },
        { status: 400 }
      );
    }

    // Clean database ID
    let cleanDbId = databaseId.trim();
    if (cleanDbId.includes('notion.so/')) {
      const parts = cleanDbId.split('/');
      const lastPart = parts[parts.length - 1].split('?')[0];
      cleanDbId = lastPart.replace(/-/g, '');
    } else {
      cleanDbId = cleanDbId.replace(/-/g, '');
    }

    // Handle Demo Mode
    if (apiKey === 'demo' || apiKey.startsWith('demo_')) {
      return NextResponse.json({
        success: true,
        syncedCount: tasks.length,
        timestamp: new Date().toISOString(),
        databaseTitle: 'College Tasks & Assignments (Demo DB)',
        isDemo: true,
        message: `Successfully simulated sync of ${tasks.length} tasks to Notion!`,
      });
    }

    // Fetch Database Schema to match property types dynamically
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
    });

    if (!dbRes.ok) {
      const errData = await dbRes.json();
      return NextResponse.json(
        { error: errData.message || 'Could not access Notion database.' },
        { status: dbRes.status }
      );
    }

    const dbData = await dbRes.json();
    const props = dbData.properties || {};
    const titleKey = Object.keys(props).find(k => props[k].type === 'title') || 'Name';

    let successCount = 0;
    const errors: string[] = [];

    // Push each task into Notion Database as a Page
    for (const task of tasks as TaskPayload[]) {
      try {
        const pageProperties: Record<string, any> = {
          [titleKey]: {
            title: [
              {
                text: {
                  content: task.title,
                },
              },
            ],
          },
        };

        // Try to map properties if matching column names or types exist
        for (const [propName, propDef] of Object.entries(props) as [string, any][]) {
          const lowerName = propName.toLowerCase();

          // Subject mapping
          if ((lowerName.includes('subject') || lowerName.includes('course')) && task.subject) {
            if (propDef.type === 'select') {
              pageProperties[propName] = { select: { name: task.subject.slice(0, 100) } };
            } else if (propDef.type === 'rich_text') {
              pageProperties[propName] = { rich_text: [{ text: { content: task.subject } }] };
            }
          }

          // Due Date mapping
          if ((lowerName.includes('due') || lowerName.includes('date') || propDef.type === 'date') && task.dueDate) {
            if (propDef.type === 'date') {
              // Ensure valid ISO date format YYYY-MM-DD
              const dateVal = task.dueDate.split('T')[0];
              pageProperties[propName] = { date: { start: dateVal } };
            }
          }

          // Priority mapping
          if (lowerName.includes('priority') && task.priority) {
            if (propDef.type === 'select') {
              pageProperties[propName] = { select: { name: task.priority.toUpperCase() } };
            } else if (propDef.type === 'status') {
              pageProperties[propName] = { status: { name: task.priority } };
            }
          }

          // Status mapping
          if (lowerName.includes('status') && task.status) {
            const statusLabel = task.status === 'completed' ? 'Done' : task.status === 'in_progress' ? 'In Progress' : 'To Do';
            if (propDef.type === 'status') {
              pageProperties[propName] = { status: { name: statusLabel } };
            } else if (propDef.type === 'select') {
              pageProperties[propName] = { select: { name: statusLabel } };
            }
          }
        }

        // Children blocks for description
        const children = task.description ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content: task.description },
                },
              ],
            },
          },
        ] : undefined;

        const pageRes = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { database_id: cleanDbId },
            properties: pageProperties,
            children,
          }),
        });

        if (pageRes.ok) {
          successCount++;
        } else {
          const pageErr = await pageRes.json();
          errors.push(`"${task.title}": ${pageErr.message}`);
        }
      } catch (err: any) {
        errors.push(`"${task.title}": ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount: successCount,
      totalCount: tasks.length,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
      databaseTitle: dbData.title?.[0]?.plain_text || 'Notion Database',
    });
  } catch (error: any) {
    console.error('Notion sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during Notion sync.' },
      { status: 500 }
    );
  }
}
