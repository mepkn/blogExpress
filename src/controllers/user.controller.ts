import { Request, Response } from 'express';
import { userService } from '../services/user.service';

export const userController = {
  changePasswordHandler: async (req: Request, res: Response) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    const userId = req.user.id;
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Old password and new password are required.' });
    }
    if (typeof oldPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'Invalid input types for passwords.' });
    }
    if (oldPassword === newPassword) {
      return res.status(400).json({ message: 'New password cannot be the same as the old password.' });
    }
    try {
      await userService.changePassword(userId, oldPassword, newPassword);
      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error: any) {
      console.error('Change password error:', error.message);
      if (error.message === 'User not found.' || error.message === 'Invalid old password.') {
        return res.status(401).json({ message: error.message });
      }
      return res.status(500).json({ message: 'Failed to change password due to an internal error.' });
    }
  },
};
