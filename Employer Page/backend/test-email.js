require('dotenv').config();

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
    try {
        if (!process.env.RESEND_API_KEY || !(process.env.RESEND_FROM || process.env.EMAIL_FROM) || !process.env.TEST_EMAIL_TO) {
            console.error('Set the Resend key, sender, and TEST_EMAIL_TO before running this test.');
            return;
        }

        const { data, error } = await resend.emails.send({
            from: process.env.RESEND_FROM || process.env.EMAIL_FROM,
            to: [process.env.TEST_EMAIL_TO],
            subject: 'CampusGig Email Test',
            html: '<strong>Your CampusGig email test works!</strong>',
        });

        if (error) {
            console.error('Resend error:', error);
            return;
        }

        console.log('Resend response:', data);
    } catch (err) {
        console.error('Email test failed:', err.message);
    }
}

testEmail();