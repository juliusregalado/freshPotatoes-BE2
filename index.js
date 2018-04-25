const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      app = express();

const { PORT=3000, NODE_ENV='development', DB_PATH='./db/database.db' } = process.env;

const API_BASE_URL = 'http://credentials-api.generalassemb.ly/4576f55f-c427-4cfc-a11c-5bfe914ca6c1';

const sequelize = new Sequelize(DB_PATH, 'root', 'password', {
  dialect: 'sqlite',
  storage: DB_PATH
});

sequelize
  .authenticate()
  .then(() => {
    console.log('Connection established successfully')
  })
  .catch(err => {
    console.log('Unable to connect to the database', err)
  })

// MODELS
const FILM = sequelize.define('film', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: Sequelize.STRING
  },
  release_date: {
    type: Sequelize.DATEONLY
  },
  tagline: {
    type: Sequelize.STRING
  },
  genre_id: {
    type: Sequelize.INTEGER
  }
}, {
  underscored: true,
  timestamps: false
});

const GENRE =  sequelize.define('genre', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING
  }
}, {
  underscored: true,
  timestamps: false
});

// START SERVER
Promise.resolve()
  .then(() => app.listen(PORT, () => console.log(`App listening on port ${PORT}`)))
  .catch((err) => { if (NODE_ENV === 'development') console.error(err.stack); });

// ROUTES
app.get('/', (req,res) => {
  res.send('You can do this!')
});
app.get('/films/all', getAllFilms);
app.get('/genres/all', getAllGenres);
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', (req,res) => {
  res.status(404).json({
    message: 'page not found'
  })
})

// ROUTE HANDLER

function getAllFilms(req, res) {
  FILM.findAll()
    .then(films => {
      console.log(films)
    })
};

function getAllGenres(req, res) {
  GENRE.findAll()
  .then(genres => {
    res.json({
      message: 'ok',
      genre: genres
    })
  })
};

function getFilmRecommendations(req, res) {
  res.status(500).send('Not Implemented');
}

module.exports = app;
