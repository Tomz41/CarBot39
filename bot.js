const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const token = '7460470600:AAFEkbAQ5O-dOLuOo0lZ00Xpl2TLRRD7yWg';
const bot = new TelegramBot(token, { polling: true });

// MongoDB setup
mongoose.connect('mongodb://localhost:27017/carClubDB');

const userSchema = new mongoose.Schema({
    chatId: Number,
    name: String,
    carModel: String,
    drive: String,
    horsePower: Number,
    number: Number
});

const eventSchema = new mongoose.Schema({
    id: String,
    title: String,
    dateTime: String,
    location: {
        latitude: Number,
        longitude: Number
    },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const adminSchema = new mongoose.Schema({
    chatId: Number
});

const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
const Admin = mongoose.model('Admin', adminSchema);

// Main menu command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const opts = {
        reply_markup: {
            keyboard: [
                [{ text: 'Регистрация' }],
                [{ text: 'Участвовать в мероприятии' }, { text: 'Посмотреть мероприятия' }],
                [{ text: 'Создать мероприятие' }, { text: 'Список участников' }]
            ],
            one_time_keyboard: true,
            resize_keyboard: true
        }
    };
    bot.sendMessage(chatId, 'Добро пожаловать! Выберите действие:', opts);
});

// Register user
bot.onText(/Регистрация/, async (msg) => {
    const chatId = msg.chat.id;
    const user = await User.findOne({ chatId });
    if (user) {
        bot.sendMessage(chatId, 'Вы уже зарегистрированы в боте.');
        return;
    }

    bot.sendMessage(chatId, 'Пожалуйста, укажите ваше имя:');
    bot.once('message', async (msg) => {
        const name = msg.text;
        bot.sendMessage(chatId, 'Укажите марку и модель вашего автомобиля:');
        bot.once('message', async (msg) => {
            const carModel = msg.text;
            bot.sendMessage(chatId, 'Выберите привод:', {
                reply_markup: {
                    keyboard: [['передний'], ['задний'], ['полный']],
                    one_time_keyboard: true
                }
            });
            bot.once('message', async (msg) => {
                const drive = msg.text;
                bot.sendMessage(chatId, 'Укажите количество лошадиных сил:');
                bot.once('message', async (msg) => {
                    const horsePower = parseInt(msg.text);
                    if (isNaN(horsePower)) {
                        bot.sendMessage(chatId, 'Ошибка: количество лошадиных сил должно быть числом.');
                        return;
                    }
                    bot.sendMessage(chatId, 'Укажите номер автомобиля (только цифры):');
                    bot.once('message', async (msg) => {
                        const number = parseInt(msg.text);
                        if (isNaN(number)) {
                            bot.sendMessage(chatId, 'Ошибка: номер автомобиля должен быть числом.');
                            return;
                        }
                        const newUser = new User({ chatId, name, carModel, drive, horsePower, number });
                        try {
                            await newUser.save();
                            bot.sendMessage(chatId, 'Регистрация завершена! Вы можете участвовать в мероприятиях.', {
                                reply_markup: {
                                    keyboard: [
                                        [{ text: 'Регистрация' }],
                                        [{ text: 'Участвовать в мероприятии' }, { text: 'Посмотреть мероприятия' }],
                                        [{ text: 'Создать мероприятие' }, { text: 'Список участников' }]
                                    ],
                                    one_time_keyboard: true,
                                    resize_keyboard: true
                                }
                            });
                        } catch (err) {
                            console.error(err);
                        }
                    });
                });
            });
        });
    });
});

// Participate in event
bot.onText(/Участвовать в мероприятии/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const events = await Event.find({});
        if (events.length === 0) {
            bot.sendMessage(chatId, 'Нет доступных мероприятий.');
            return;
        }

        const eventButtons = events.map((event, index) => [{ text: `${index + 1}. ${event.title}`, callback_data: `participate_event_${event.id}` }]);
        bot.sendMessage(chatId, 'Выберите мероприятие для участия:', {
            reply_markup: {
                inline_keyboard: eventButtons
            }
        });
    } catch (err) {
        console.error(err);
    }
});

// View events
bot.onText(/Посмотреть мероприятия/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const events = await Event.find({});
        if (events.length === 0) {
            bot.sendMessage(chatId, 'Нет доступных мероприятий.');
            return;
        }

        const eventButtons = events.map((event, index) => [{ text: `${index + 1}. ${event.title}`, callback_data: `view_event_${event.id}` }]);
        bot.sendMessage(chatId, 'Все мероприятия:', {
            reply_markup: {
                inline_keyboard: eventButtons
            }
        });
    } catch (err) {
        console.error(err);
    }
});

// Create event
bot.onText(/Создать мероприятие/, async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = await Admin.findOne({ chatId });
    if (!isAdmin) {
        bot.sendMessage(chatId, 'Вы не имеете прав для выполнения этой команды.');
        return;
    }

    bot.sendMessage(chatId, 'Введите название мероприятия:');
    bot.once('message', async (msg) => {
        const title = msg.text;
        bot.sendMessage(chatId, 'Введите дату и время мероприятия:');
        bot.once('message', async (msg) => {
            const dateTime = msg.text;
            bot.sendMessage(chatId, 'Отправьте GPS метку места сбора:');
            bot.once('location', async (msg) => {
                const location = {
                    latitude: msg.location.latitude,
                    longitude: msg.location.longitude
                };
                const newEvent = new Event({ id: uuidv4(), title, dateTime, location });
                try {
                    await newEvent.save();
                    const eventDetails = `Мероприятие: ${title}\nДата и время: ${dateTime}\nТочка сбора: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
                    bot.sendMessage(chatId, `Созданное мероприятие:\n${eventDetails}\n\nВыберите действие:`, {
                        reply_markup: {
                            inline_keyboard: [
                                [{ text: 'Все верно, опубликовать', callback_data: `publish_${newEvent.id}` }],
                                [{ text: 'Отменить создание мероприятия', callback_data: `cancel_${newEvent.id}` }]
                            ]
                        }
                    });
                } catch (err) {
                    console.error(err);
                }
            });
        });
    });
});

// List participants command
bot.onText(/Список участников/, async (msg) => {
    const chatId = msg.chat.id;
    try {
        const users = await User.find({});
        if (users.length === 0) {
            bot.sendMessage(chatId, 'Нет зарегистрированных участников.');
            return;
        }

        users.sort((a, b) => {
            if (a.drive === b.drive) {
                return b.horsePower - a.horsePower;
            }
            return a.drive.localeCompare(b.drive);
        });

        const participantsList = users.map(user => `${user.name}: ${user.carModel} (${user.drive}), ${user.horsePower} ЛС, номер ${user.number}`).join('\n');
        bot.sendMessage(chatId, `Список участников:\n${participantsList}`);
    } catch (err) {
        console.error(err);
    }
});

// Add admin command
bot.onText(/\/add_admin/, async (msg) => {
    const chatId = msg.chat.id;
    const isAdmin = await Admin.findOne({ chatId });
    if (!isAdmin) {
        bot.sendMessage(chatId, 'Вы не имеете прав для выполнения этой команды.');
        return;
    }
    bot.sendMessage(chatId, 'Введите chatId нового администратора:');
    bot.once('message', async (msg) => {
        const newAdminChatId = parseInt(msg.text);
        if (isNaN(newAdminChatId)) {
            bot.sendMessage(chatId, 'Ошибка: chatId должен быть числом.');
            return;
        }
        const newAdmin = new Admin({ chatId: newAdminChatId });
        try {
            await newAdmin.save();
            bot.sendMessage(chatId, 'Новый администратор добавлен.');
        } catch (err) {
            console.error(err);
            bot.sendMessage(chatId, 'Произошла ошибка при добавлении администратора.');
        }
    });
});

// Handle callback queries
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data.split('_');
    const action = data[0];
    const eventId = data[data.length - 1];
    const subAction = data.length > 2 ? data[1] : null;

    if (action === 'participate' && subAction === 'event') {
        try {
            const event = await Event.findOne({ id: eventId });
            const user = await User.findOne({ chatId });
            if (!event || !user) return;
            if (event.participants.includes(user._id)) {
                bot.sendMessage(chatId, 'Вы уже зарегистрированы на это мероприятие.');
                return;
            }
            event.participants.push(user._id);
            await event.save();
            bot.sendMessage(chatId, 'Вы добавлены в список участников!');
        } catch (err) {
            console.error(err);
        }
    } else if (action === 'view' && subAction === 'event') {
        try {
            const event = await Event.findOne({ id: eventId }).populate('participants');
            const eventDetails = `Мероприятие: ${event.title}\nДата и время: ${event.dateTime}\nТочка сбора: https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}`;
            const carList = event.participants.map(user => `${user.name}: ${user.carModel} (${user.drive}), ${user.horsePower} ЛС, номер ${user.number}`).join('\n');
            const isAdmin = await Admin.findOne({ chatId });
            const keyboard = [
                [{ text: 'Редактировать', callback_data: `edit_${event.id}` }],
                [{ text: 'Удалить', callback_data: `delete_${event.id}` }]
            ];
            if (!isAdmin) keyboard.length = 0;
            bot.sendMessage(chatId, `${eventDetails}\n\nСписок машин:\n${carList}`, {
                reply_markup: {
                    inline_keyboard: keyboard
                }
            });
        } catch (err) {
            console.error(err);
        }
    } else if (action === 'list' && subAction === 'cars') {
        try {
            const event = await Event.findOne({ id: eventId }).populate('participants');
            const carList = event.participants.map(user => `${user.name}: ${user.carModel} (${user.drive}), ${user.horsePower} ЛС, номер ${user.number}`).join('\n');
            bot.sendMessage(chatId, `Список машин на мероприятии "${event.title}":\n${carList}`);
        } catch (err) {
            console.error(err);
        }
    } else if (action === 'publish') {
        try {
            const event = await Event.findOne({ id: eventId });
            notifyUsers(event);
            bot.sendMessage(chatId, 'Мероприятие опубликовано и уведомления отправлены всем участникам.');
        } catch (err) {
            console.error(err);
        }
    } else if (action === 'cancel') {
        try {
            await Event.findOneAndDelete({ id: eventId });
            bot.sendMessage(chatId, 'Создание мероприятия отменено.');
        } catch (err) {
            console.error(err);
        }
    } else if (action === 'edit') {
        const isAdmin = await Admin.findOne({ chatId });
        if (!isAdmin) {
            bot.sendMessage(chatId, 'Вы не имеете прав для выполнения этой команды.');
            return;
        }
        editEvent(chatId, eventId);
    } else if (action === 'delete') {
        const isAdmin = await Admin.findOne({ chatId });
        if (!isAdmin) {
            bot.sendMessage(chatId, 'Вы не имеете прав для выполнения этой команды.');
            return;
        }
        deleteEvent(chatId, eventId);
    }
});

// Helper functions
async function notifyUsers(event) {
    try {
        const users = await User.find({});
        const eventMessage = `Мероприятие: ${event.title}\nДата и время: ${event.dateTime}\nТочка сбора: https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}\nПодтвердите участие:`;
        for (const user of users) {
            await bot.sendMessage(user.chatId, eventMessage, {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Я буду на мероприятие', callback_data: `participate_event_${event.id}` }],
                        [{ text: 'Нет, спасибо', callback_data: `decline` }]
                    ]
                }
            });
        }
    } catch (err) {
        console.error(err);
    }
}

async function notifyParticipants(event, message) {
    try {
        const participants = await User.find({ _id: { $in: event.participants } });
        for (const participant of participants) {
            await bot.sendMessage(participant.chatId, message);
        }
    } catch (err) {
        console.error(err);
    }
}

async function editEvent(chatId, eventId) {
    try {
        const event = await Event.findOne({ id: eventId });
        if (!event) {
            bot.sendMessage(chatId, 'Мероприятие не найдено.');
            return;
        }
        bot.sendMessage(chatId, `Редактирование мероприятия: ${event.title}\nЧто вы хотите изменить? (название/время/место)`);
        bot.once('message', async (msg) => {
            const field = msg.text.toLowerCase();
            const fieldMap = {
                'название': 'title',
                'время': 'dateTime',
                'место': 'location'
            };
            if (field === 'место') {
                bot.sendMessage(chatId, 'Отправьте новую GPS метку места сбора:');
                bot.once('location', async (msg) => {
                    event.location = {
                        latitude: msg.location.latitude,
                        longitude: msg.location.longitude
                    };
                    try {
                        await event.save();
                        bot.sendMessage(chatId, 'Мероприятие успешно обновлено.');
                        notifyParticipants(event, `Мероприятие "${event.title}" было обновлено. Новое место сбора: https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}`);
                    } catch (err) {
                        console.error(err);
                    }
                });
            } else {
                bot.sendMessage(chatId, `Введите новое значение для ${field}:`);
                bot.once('message', async (msg) => {
                    event[fieldMap[field]] = msg.text;
                    try {
                        await event.save();
                        bot.sendMessage(chatId, 'Мероприятие успешно обновлено.');
                        notifyParticipants(event, `Мероприятие "${event.title}" было обновлено. Новое значение для поля "${field}": ${msg.text}`);
                    } catch (err) {
                        console.error(err);
                    }
                });
            }
        });
    } catch (err) {
        console.error(err);
    }
}

async function deleteEvent(chatId, eventId) {
    try {
        const event = await Event.findOne({ id: eventId });
        if (!event) {
            bot.sendMessage(chatId, 'Мероприятие не найдено.');
            return;
        }
        await Event.findOneAndDelete({ id: eventId });
        bot.sendMessage(chatId, `Мероприятие "${event.title}" было удалено.`);
        notifyParticipants(event, `Мероприятие "${event.title}" было отменено.`);
    } catch (err) {
        console.error(err);
    }
}
