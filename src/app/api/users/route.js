import { NextResponse } from 'next/server';
import { query, execute } from '@/services/database/dbService';
import { hashPassword, getSafeUserData } from '@/services/auth/authService';
import { requireAdmin } from '@/lib/authMiddleware';

// GET all users (admin only)
export async function GET() {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const users = await query('SELECT * FROM liftr_users ORDER BY createdAt DESC');
    
    // Remove passwords from response
    const safeUsers = users.map(user => getSafeUserData(user));

    return NextResponse.json({
      success: true,
      users: safeUsers,
    });
  } catch (error) {
    console.error('Fetch users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST create new user (admin only)
export async function POST(request) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { username, password, name, role = 'user' } = await request.json();

    // Validate input
    if (!username || !password || !name) {
      return NextResponse.json(
        { error: 'Username, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const existingUser = await query(
      'SELECT id FROM liftr_users WHERE username = ?',
      [username]
    );

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await execute(
      'INSERT INTO liftr_users (username, password, name, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, name, role]
    );

    // Fetch created user
    const newUser = await query(
      'SELECT * FROM liftr_users WHERE id = ?',
      [result.lastInsertRowid]
    );

    return NextResponse.json({
      success: true,
      user: getSafeUserData(newUser[0]),
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

