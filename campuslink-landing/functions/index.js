const functions = require("firebase-functions");
const nodemailer = require("nodemailer");

// Configurer ton compte Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
   user: "slovengama@gmail.com",
    pass: "rlcvqgohemjuaggk" ,// mot de passe d'application Gmail
  },
});

// Fonction HTTP pour envoyer un mail
exports.sendConfirmationEmail = functions.https.onRequest(async (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.status(400).send("Email manquant");
  }

  const mailOptions = {
    from: "CampusLink <ton.email@gmail.com>",
    to: email,
    subject: "Confirmation d'inscription",
    html: `<h1>Merci pour votre inscription !</h1>
           <p>Votre email ${email} a été enregistré avec succès.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).send("Email envoyé !");
  } catch (error) {
    console.error(error);
    return res.status(500).send("Erreur lors de l'envoi de l'email.");
  }
});