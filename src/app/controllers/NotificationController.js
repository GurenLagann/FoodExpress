import User from '../models/User';
import Notification from '../schema/Notification';

class NotificationController {
    async index(req, res) {
        const checkUserProvider = await User.findOne({
            where: { id: req.userId, provider: true },
        });

        if (!checkUserProvider) {
            return res
                .status(401)
                .json({ error: 'Only providers can load notifications' });
        }

        const notifications = await Notification.find({
            user: req.userId,
        })
            .sort({ createAt: 'desc' })
            .limit(20);

        return res.json(notifications);
    }

    async update(req, res) {
        const notification = await Notification.findByIdAndUpdate(
            req.params.id,
            { read: true },
            { new: true }
        );

        return res.json(notification);
    }
}

export default new NotificationController();
