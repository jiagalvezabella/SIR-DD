const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const app = express();
const PORT = 3000;

const server = http.createServer(app);
const io = socketIo(server); 

app.use(express.json());
app.use(cors());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});


const upload = multer({ storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

let users = [
  { id: 'default-user-id', email: 'user@gmail.com', password: 'password123', profile_image: null },
];

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', upload.single('profile_image'), (req, res) => {
  const { email, password } = req.body;
  let profile_image = null;

  if (req.file) {
    profile_image = `http://192.168.254.104:${PORT}/uploads/${req.file.filename}`;
  }

  if (email && password) {
    const newUser = { id: Date.now().toString(), email, password, profile_image };
    users.push(newUser);
    res.status(201).json(newUser);

    io.emit('userAdded', newUser);
  } else {
    console.error('Validation error: Missing email or password');
    res.status(400).json({ error: 'Email and password are required' });
  }
});

app.put('/api/users/:id', upload.single('profile_image'), (req, res) => {
  const { email, password } = req.body;
  let profile_image = null;

  if (req.file) {
    profile_image = `http://192.168.254.104:${PORT}/uploads/${req.file.filename}`;
    
    const user = users.find((u) => u.id === req.params.id);
    if (user && user.profile_image) {
      const oldImagePath = user.profile_image.split(`${PORT}/uploads/`)[1];
      if (oldImagePath && fs.existsSync(path.join(__dirname, 'uploads', oldImagePath))) {
        fs.unlinkSync(path.join(__dirname, 'uploads', oldImagePath));
      }
    }
  }

  const userIndex = users.findIndex((u) => u.id === req.params.id);
  if (userIndex !== -1) {
    const updatedUser = { ...users[userIndex], email, password, profile_image: profile_image || users[userIndex].profile_image };
    users[userIndex] = updatedUser;
    res.status(200).json(updatedUser);

    io.emit('userUpdated', updatedUser);
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running at http://192.168.254.104:${PORT}`);
});
