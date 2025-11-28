import { NextResponse } from 'next/server';
import { execute, queryOne } from '@/services/database/dbService';
import { getSafeUserData } from '@/services/auth/authService';
import { requireAdmin } from '@/lib/authMiddleware';

// DELETE user (admin only)
export async function DELETE(request, { params }) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = params;

    // Check if user exists
    const user = await queryOne('SELECT * FROM liftr_users WHERE id = ?', [id]);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent deleting yourself
    if (user.id === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Delete user
    await execute('DELETE FROM liftr_users WHERE id = ?', [id]);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

