// dotenv siirtää .env muuttujat saataviksi
const dotenv = require('dotenv');
dotenv.config();

// Kaikki muu tarvittava esim. nodemailer sähköpostien lähettämiseksi
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')
const nodemailer = require("nodemailer");
const axios = require('axios').default;
const mariadb = require('mariadb');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Hyväksy vain pyynnöt tietyistä osoitteista
app.use(cors({
  origin: ['https://www.villeehrukainen.fi', 'http://localhost:3001']
}));

// Repatcha tarkistus
function reCaptcha(token) {
  // Jos recaptcha tokenia ei ole palauta virhe
  if(!token) {
    return res.send({status: 'error', reason: 'Recaptcha tokenia ei vastaanotettu!'});
  }

  // Recaptcha tarkistukseen URL
  const recaptchaUrl = "https://www.google.com/recaptcha/api/siteverify?secret="+process.env.RECAPTCHA_SECRET+"&response="+token+"";

  axios.get(recaptchaUrl)
        .then(function (response) {
            if(response.data.success == true && parseFloat(response.data.score) >= 0.5) {
              const recaptchaStatus = true, recaptchaReason = "Recaptcha tarkistus onnistui!";
              return {recaptchaStatus,recaptchaReason};
            } else {
              const recaptchaStatus = false, recaptchaReason = "Recaptcha tarkistus epäonnistui!";
              return {recaptchaStatus,recaptchaReason};
            }
        })
        .catch(function (error) {
            if (error.response) {
              // The request was made and the server responded with a status code
              // that falls out of the range of 2xx
              const recaptchaStatus = false, recaptchaReason = "Recaptcha tuntematon virhe 1!";
              return {recaptchaStatus,recaptchaReason};
            } else if (error.request) {
              // The request was made but no response was received
              const recaptchaStatus = false, recaptchaReason = "Recaptcha palvelu ei vastannut!";
              return {recaptchaStatus,recaptchaReason};
            } else {
              // Something happened in setting up the request that triggered an Error
              const recaptchaStatus = false, recaptchaReason = "Recaptcha tuntematon virhe 2!";
              return {recaptchaStatus,recaptchaReason};
            }
          });
}

/* Viesti kävijälle. Eli polun / GET */
app.get('/', function(req, res) {
  // Lähetä HTTP vastaus
  return res.send('<h2>Express NodeJS API</h2><br/><p>Ville Ehrukainen 2022</p>');
});

/* Hae nasa apod apin vastaus. TARKISTETTU: OK*/
app.get('/apod', function(req, res) {
  axios.get('https://api.nasa.gov/planetary/apod?api_key='+process.env.APOD_APIKEY)
  .then(function (response) {
    const hdurl = response.data.hdurl;
    const copyright = response.data.copyright;
    const date = response.data.date;
    // Lähetä HTTP vastaus JSON muodossa
    return res.send({status: 'success', hdurl: hdurl, copyright: copyright, date: date});
  })
  // Jos pyynnössä virhe...
  .catch(function (error) {
    return res.send({status: 'error', reason: error});
  });
});

/* Käsittele POST pyyntö  TARKISTETTU: OK*/
app.post('/mail', function(req, res) {
  // Saa POST arvot
  const email = req.body.email;
  const msg = req.body.msg;
  const token = req.body.token;

  // Jos tarvittavia arvoja ei ole palauta virhe
  if(!email || !msg) {
    return res.send({status: 'error', reason: 'Täytä kaikki vaaditut kentät!'});
  }
  
  // Recaptcha tarkistuksen vastaus
  const recaptcha = reCaptcha(token);
  const recaptchaStatus = recaptcha.recaptchaStatus, recaptchaReason = recaptcha.recaptchaReason;

    if(recaptchaStatus === true) {
      main().catch();
      // async..await is not allowed in global scope, must use a wrapper
      async function main() {
        // create reusable transporter object using the default SMTP transport
        let transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: 465,
            secure: true, // true for 465, false for other ports
            //requireTLS: true,
            auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS,
            },
        });
    
        // varmistusviesti käyttäjälle
        let info0 = await transporter.sendMail({
            from: '"Ville Ehrukainen" <admin@villeehrukainen.fi>', // sender address
            to: email, // list of receivers
            subject: "Viesti vastaanotettu!", // Subject line
            text: "Viestisi on onnistuneesti vastaanotettu.", // plain text body
            html: "<p>Hei!, "+email+"</p><br/><p>Viestisi on onnistuneesti vastaanotettu, kiitos kiinnostuksestasi.</p><br/><p>Terveisin,<br/>Ville Ehrukainen</p><br/><a href='https://villeehrukainen.fi/' target='_blank' rel='noopener noreferrer'>villeehrukainen.fi</a>", // html body
        });
    
        // viestin sisältö adminille
        let info1 = await transporter.sendMail({
            from: '"Ville Ehrukainen" <admin@villeehrukainen.fi>', // sender address
            to: "ville.ehrukainen2@gmail.com", // list of receivers
            subject: "Viesti REACTCV", // Subject line
            text: "", // plain text body
            html: "<h4>"+email+"</h4><br/><p>"+msg+"</p>", // html body
        });
      }
      return res.send({status: 'success', reason: 'Viestin lähettäminen onnistui!'})
    } else {
      return res.send({status: 'error', reason: recaptchaReason})
    }
});

/* Lähetä palaute tietokantaan. TARKISTETTU: OK*/
app.post('/feedback', function(req, res) {
  // Saa POST arvot
  const email = req.body.email;
  const msg = req.body.message;
  const responsiivisuus = req.body.responsiivisuus;
  const kaytettavyys = req.body.kaytettavyys;
  const ulkoasu = req.body.ulkoasu;
  const token = req.body.token;

  // Jos tarvittavia arvoja ei ole palauta virhe
  if(!responsiivisuus || !kaytettavyys || !ulkoasu || !email) {
      return res.send({status: 'error', reason: 'Täytä kaikki vaaditut kentät!'});
  }

  // Recaptcha tarkistuksen vastaus
  const recaptcha = reCaptcha(token);
  const recaptchaStatus = recaptcha.recaptchaStatus, recaptchaReason = recaptcha.recaptchaReason;

    if(recaptchaStatus === true) {
      const pool = mariadb.createPool({host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_FEEDBACK, connectionLimit: 10});
      pool.getConnection()
          .then(conn => {
            // Tarkista yhteys
            conn.query("SELECT 1 as val")
              .then(rows => { // rows: [ {val: 1}, meta: ... ]
                if(msg){
                  conn.query("INSERT INTO palaute (responsiivisuus, kaytettavuus, ulkoasu, sahkoposti, viesti) value (?,?,?,?,?)", [responsiivisuus, kaytettavyys, ulkoasu, email, msg]);
                } else {
                  conn.query("INSERT INTO palaute (responsiivisuus, kaytettavuus, ulkoasu, sahkoposti) value (?,?,?,?)", [responsiivisuus, kaytettavyys, ulkoasu, email]);
                }
              })
              .then(res => { // res: { affectedRows: 1, insertId: 1, warningStatus: 0 }
                conn.release(); // release to pool
              })
              .catch(err => {
                conn.release(); // release to pool
                return res.send({status: 'error', reason: 'Tietokantapyyntö epäonnistui!'})
              })
              
          }).catch(err => {
            //not connected
            return res.send({status: 'error', reason: 'Tietokantayhteys epäonnistui!'})
          });
          return res.send({status: 'success', reason: 'Palautteen lähettäminen onnistui!'})
          } else {
            return res.send({status: 'error', reason: recaptchaReason})
          }
});
// Kuuntele tiettyä porttia
const port = process.env.PORT;
app.listen(port, () => {
  console.log(`${port}`)
})

module.exports = app;