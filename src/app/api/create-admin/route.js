import { NextResponse } from 'next/server';
import { hashPassword } from '@/services/auth/authService';
import { execute, queryOne } from '@/services/database/dbService';

export async function POST() {
  try {
    // Check if admin already exists
    const existingAdmin = await queryOne(
      'SELECT id FROM liftr_users WHERE username = ?',
      ['admin']
    );

    if (existingAdmin) {
      return NextResponse.json(
        { error: 'Admin user already exists. Use username "admin" with password "admin123" to login.' },
        { status: 400 }
      );
    }

    // Create admin user
    const hashedPassword = await hashPassword('admin123');
    
    await execute(
      'INSERT INTO liftr_users (username, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?)',
      ['admin', hashedPassword, 'Admin User', 'admin', new Date().toISOString()]
    );

    return NextResponse.json({
      success: true,
      message: 'Admin user created successfully',
      credentials: {
        username: 'admin',
        password: 'admin123',
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create admin user' },
      { status: 500 }
    );
  }
}



