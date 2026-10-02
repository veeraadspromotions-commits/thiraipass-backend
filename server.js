const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. மாதிரித் தரவுகள் (Mock Data - Tamil Cinema)
// ==========================================

const movies = [
  {
    id: 1,
    title: "லியோ (Leo)",
    language: "Tamil",
    genre: "Action / Thriller",
    duration: "2h 44m",
    rating: "8.2/10",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500"
  },
  {
    id: 2,
    title: "ஜெயிலர் (Jailer)",
    language: "Tamil",
    genre: "Action / Drama",
    duration: "2h 48m",
    rating: "8.5/10",
    poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500"
  }
];

const theatres = [
  { id: 1, name: "SPI Cinemas (Sathyam)", city: "Chennai", location: "Royapettah" },
  { id: 2, name: "Rohini Silver Screens", city: "Chennai", location: "Koyambedu" },
  { id: 3, name: "PVR VR Mall", city: "Chennai", location: "Anna Nagar" }
];

const shows = [
  { id: 101, movieId: 1, theatreId: 1, screen: "Screen 1", time: "10:30 AM", price: 190 },
  { id: 102, movieId: 1, theatreId: 1, screen: "Screen 1", time: "02:15 PM", price: 190 },
  { id: 103, movieId: 1, theatreId: 2, screen: "Main Screen", time: "06:45 PM", price: 150 },
  { id: 104, movieId: 2, theatreId: 3, screen: "Audi 2", time: "11:00 AM", price: 210 }
];

// இருக்கைகள் அமைப்பு (Seats: A1 - A6, B1 - B6)
// status: 'AVAILABLE', 'LOCKED', 'BOOKED'
let seatInventory = {
  101: [
    { id: "A1", status: "AVAILABLE", price: 190 },
    { id: "A2", status: "AVAILABLE", price: 190 },
    { id: "A3", status: "BOOKED", price: 190 },
    { id: "A4", status: "BOOKED", price: 190 },
    { id: "A5", status: "AVAILABLE", price: 190 },
    { id: "A6", status: "AVAILABLE", price: 190 },
    { id: "B1", status: "AVAILABLE", price: 190 },
    { id: "B2", status: "AVAILABLE", price: 190 },
    { id: "B3", status: "AVAILABLE", price: 190 },
    { id: "B4", status: "AVAILABLE", price: 190 },
    { id: "B5", status: "AVAILABLE", price: 190 },
    { id: "B6", status: "AVAILABLE", price: 190 }
  ]
};

// ==========================================
// 2. API வழிகள் (Endpoints)
// ==========================================

// முகப்பு வழி
app.get('/', (req, res) => {
  res.json({ message: "ThiraiPass (திரைபாஸ்) API வெற்றிகரமாக இயங்குகிறது!" });
});

// அணைத்து திரைப்படங்களின் பட்டியல்
app.get('/api/movies', (req, res) => {
  res.json(movies);
});

// ஒரு குறிப்பிட்ட திரைப்படத்தின் விவரம்
app.get('/api/movies/:id', (req, res) => {
  const movie = movies.find(m => m.id === parseInt(req.params.id));
  if (!movie) return res.status(404).json({ error: "திரைப்படம் கிடைக்கவில்லை" });
  res.json(movie);
});

// ஒரு திரைப்படத்திற்கான திரையரங்குகள் & காட்சி நேரங்கள்
app.get('/api/movies/:id/shows', (req, res) => {
  const movieId = parseInt(req.params.id);
  const movieShows = shows.filter(s => s.movieId === movieId);
  
  const result = movieShows.map(show => {
    const theatre = theatres.find(t => t.id === show.theatreId);
    return {
      showId: show.id,
      theatreName: theatre ? theatre.name : "Theatre",
      location: theatre ? theatre.location : "",
      screen: show.screen,
      time: show.time,
      price: show.price
    };
  });
  
  res.json(result);
});

// ஒரு காட்சிக்கான இருக்கைகள் விவரம்
app.get('/api/shows/:showId/seats', (req, res) => {
  const showId = req.params.showId;
  const seats = seatInventory[showId] || seatInventory[101]; // மாதிரித் தரவு
  res.json(seats);
});

// இருக்கைகளை தற்காலிகமாகப் பூட்டுதல் (Seat Locking - 10 Mins)
app.post('/api/seats/lock', (req, res) => {
  const { showId, seatIds } = req.body;
  const seats = seatInventory[showId] || seatInventory[101];

  // தேர்வு செய்யப்பட்ட இருக்கைகள் ஏற்கனவே புக் செய்யப்பட்டுள்ளதா என சரிபார்த்தல்
  const alreadyTaken = seats.some(
    s => seatIds.includes(s.id) && s.status !== 'AVAILABLE'
  );

  if (alreadyTaken) {
    return res.status(400).json({ error: "சில இருக்கைகள் ஏற்கனவே முன்பதிவு செய்யப்பட்டுள்ளன!" });
  }

  // தற்காலிகமாக LOCKED என மாற்றுதல்
  seats.forEach(s => {
    if (seatIds.includes(s.id)) {
      s.status = 'LOCKED';
    }
  });

  res.json({
    message: "இருக்கைகள் 10 நிமிடங்களுக்குப் பூட்டப்பட்டுள்ளன. பணம் செலுத்துங்கள்.",
    lockedSeats: seatIds
  });
});

// முன்பதிவை உறுதிசெய்தல் (Confirm Booking)
app.post('/api/bookings/confirm', (req, res) => {
  const { showId, seatIds, userEmail, userPhone } = req.body;
  const seats = seatInventory[showId] || seatInventory[101];

  // இருக்கைகளை நிரந்தரமாக BOOKED என மாற்றுதல்
  seats.forEach(s => {
    if (seatIds.includes(s.id)) {
      s.status = 'BOOKED';
    }
  });

  const bookingId = "TP-" + Math.floor(100000 + Math.random() * 900000);

  res.json({
    message: "முன்பதிவு வெற்றிகரமாக முடிந்தது!",
    bookingId: bookingId,
    bookedSeats: seatIds,
    qrCodeString: `THIRAIPASS:${bookingId}:${seatIds.join(',')}`
  });
});

// சர்வரைத் தொடங்குதல்
app.listen(PORT, () => {
  console.log(`ThiraiPass சர்வர் போர்ட் ${PORT}-ல் தயாராக உள்ளது!`);
});
