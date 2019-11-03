import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import File from '../models/File';
import Appointment from '../models/Appointments';
import Notification from '../schema/Notification';

class AppointmentController {
    async index(req, res) {
        const { page = 1 } = req.query;

        const Appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            attributes: ['id', 'date'],
            limit: 20,
            offset: (page - 1) * 20,
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
                    include: [
                        {
                            model: File,
                            as: 'avatar',
                            attributes: ['id', 'path', 'url'],
                        },
                    ],
                },
            ],
        });

        return res.json(Appointments);
    }

    async store(req, res) {
        const schema = Yup.object().shape({
            provider_id: Yup.number().required(),
            date: Yup.date().required(),
        });

        if (!(await schema.isValid(req.body))) {
            return res.status(400).json({ error: 'Validation Fails' });
        }

        const { provider_id, date } = req.body;

        /**
         * Check is providor_id a provider
         */
        const isProvider = await User.findOne({
            where: { id: provider_id, provider: true },
        });

        if (!isProvider) {
            return res.status(401).json({
                error: 'You can only create appointments with providers ',
            });
        }

        /**
         * Check the porvider
         */
        const theSame = req.userId === provider_id;

        if (theSame) {
            return res.status(401).json({
                error: 'You cannot create an appointment with yourself',
            });
        }

        /**
         * Check for past dates
         */

        const hoursStart = startOfHour(parseISO(date));

        if (isBefore(hoursStart, new Date())) {
            return res
                .status(400)
                .json({ error: 'Past dates are not permited' });
        }

        /**
         * Check date availability
         */

        const checkAvailability = await Appointment.findOne({
            where: {
                provider_id,
                canceled_at: null,
                date: hoursStart,
            },
        });

        if (checkAvailability) {
            return res
                .status(400)
                .json({ error: 'Appointment date is note availible' });
        }

        const appointment = await Appointment.create({
            user_id: req.userId,
            provider_id,
            date: hoursStart,
        });

        /**
         * Notify appointment provider
         */

        const user = await User.findByPk(req.userId);
        const formatDate = format(
            hoursStart,
            "'dia' dd 'de' MMMM', às ' H:mm'h'",
            { locale: pt }
        );

        await Notification.create({
            content: `Novo agendamente de ${user.name} para ${formatDate}`,
            user: provider_id,
        });

        return res.json(appointment);
    }

    async delete(req, res) {
        const appointment = await Appointment.findByPk(req.params.id);

        if (appointment.user_id !== req.userId) {
            return res.status(401).json({
                error: "You don't have permission to cancel this appointment",
            });
        }

        const dateWithSub = subHours(appointment.date, 2);

        if (isBefore(dateWithSub, new Date())) {
            return res.status(401).json({
                error: 'You can only cancel appoitnmentes 2 hours in advance',
            });
        }

        appointment.canceled_at = new Date();

        await appointment.save();

        return res.json(appointment);
    }
}

export default new AppointmentController();
