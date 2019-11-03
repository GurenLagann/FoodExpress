import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore } from 'date-fns';
import Appointment from '../models/Appointments';
import User from '../models/User';

class AppointmentController {
    async index(req, res) {
        const Appointments = await Appointment.findAll({
            where: { user_id: req.userId, canceled_at: null },
            order: ['date'],
            include: [
                {
                    model: User,
                    as: 'provider',
                    attributes: ['id', 'name'],
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

        return res.json(appointment);
    }
}

export default new AppointmentController();
