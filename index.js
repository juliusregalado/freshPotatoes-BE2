const sqlite = require('sqlite'),
      Sequelize = require('sequelize'),
      request = require('request'),
      express = require('express'),
      // body-parser = require('body-parser'),
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
// app.get('/films/all', getAllFilms);
// app.get('/genres/all', getAllGenres);
app.get('/films/:id/recommendations', getFilmRecommendations);
app.get('*', (req,res) => {
  res.status(404).json({
    message: 'page not found'
  })
})

// ROUTE HANDLER

// function getAllFilms(req, res) {
//   FILM.findAll()
//     .then(films => {
//       console.log(films)
//     })
// };
//
// function getAllGenres(req, res) {
//   GENRE.findAll()
//   .then(genres => {
//     res.json({
//       message: 'ok',
//       genre: genres
//     })
//   })
// };

function getFilmRecommendations(req, res) {
  // res.status(500).send('Not Implemented');
  console.log('getFilmRecommendations -->')
  let limit = 10, offset = 0;
  if (!Number.isInteger(parseInt(req.params.id, 10))) {
    res.status(422).json({
      message: 'error, bad request -getFilmRecommendations'
    });
  }
  if (req.query.limit) {
    if (!Number.isInteger(parseInt(req.query.limit, 10))) {
      res.status(422).json({
        message: 'error, bad request -getFilmRecommendations'
      });
    }
    limit = parseInt(req.query.limit, 10);
  }
  if (req.query.offset) {
    if (!Number.isInteger(parseInt(req.query.offset, 10))) {
      res.status(422).json({
        message: 'error, bad request -getFilmRecommendations'
      });
    }
    offset = parseInt(req.query.offset, 10);
  }
  FILM.findById(req.params.id, {})
    .then(film => {
      GENRE.findById(film.genre_id, {})
        .then(genre => {
          let startDate = new Date(film.release_date);
          startDate.setFullYear(startDate.getFullYear() - 15);
          let endDate = new Date(film.release_date);
          endDate.setFullYear(endDate.getFullYear() + 15);
          FILM.all({
            where: {
              genre_id: film.genre_id,
              release_date: {
                $between: [startDate, endDate]
              }
            },
            order: ['id']
          })
          .then(films => {
            const film_ids = films.map(film => {
              return film.id
            });
            const film_ids_str = film_ids.join(',');
            request(`${ API_BASE_URL }?films=${ film_ids_str }`, (err, response, body) => {
              const reviewedFilms = JSON.parse(body);
              const reviewedFilmsOverFive = reviewedFilms.filter(reviewedFilm => {
                return reviewedFilm.reviews.length >= 5;
              });
              const reviewedFilmsWithAverage = reviewedFilmsOverFive.map(reviewedFilm => {
                const totalRating = reviewedFilm.reviews.reduce((sum, val) => {
                  return sum + val.rating;
                }, 0);
                const averageRating = totalRating / reviewedFilm.reviews.length;
                reviewedFilm.average_rating = averageRating;
                return reviewedFilm;
              });
              const reviewedFilmsAboveAverage = reviewedFilmsWithAverage.filter(reviewedFilm => {
                return reviewedFilm.average_rating > 4;
              });
              const reviewedFilmsAboveAverageIds = reviewedFilmsAboveAverage.map(film => {
                return film.film_id;
              });
              FILM.all({
                attributes: ['id', 'title', 'release_date'],
                where: { 'id': { in: reviewedFilmsAboveAverageIds }},
                order: ['id']
              })
              .then(recommendedFilms => {
                const finalRecommendedFilms = recommendedFilms.map(film => {
                  const matchedFilm = reviewedFilmsAboveAverage.filter(element => {
                    return element.film_id = film.id;
                  })
                  return {
                    id: matchedFilm[0].film_id,
                    title: film.title,
                    releaseDate: film.release_date,
                    genre: genre.name,
                    averageRating: matchedFilm[0].average_rating,
                    reviews: matchedFilm[0].reviews.length
                  }
                })
                res.json({
                  recommendations: finalRecommendedFilms,
                  meta: {
                    limit: limit,
                    offset: offset
                  }
                });
              })
              .catch(err => {
                res.status(500).json(err);
              });
            });
          })
          .catch(err => {
            res.status(500).json(err);
          });
        })
        .catch(err => {
          res.status(500).json(err);
        });
    })
    .catch(err => {
      res.status(500).json(err);
    });
}

module.exports = app;
