import { NextResponse } from 'next/server';
import { execute, queryOne } from '@/services/database/dbService';
import { hashPassword, getSafeUserData } from '@/services/auth/authService';
import { requireAdmin } from '@/lib/authMiddleware';

// PUT reset user password (admin only)
export async function PUT(request, { params }) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = params;
    const { newPassword } = await request.json();

    // Validate input
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await queryOne('SELECT * FROM liftr_users WHERE id = ?', [id]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await execute(
      'UPDATE liftr_users SET password = ? WHERE id = ?',
      [hashedPassword, id]
    );

    // Fetch updated user
    const updatedUser = await queryOne('SELECT * FROM liftr_users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      user: getSafeUserData(updatedUser),
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}

