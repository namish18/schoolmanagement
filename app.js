const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root123',
  database: 'school_management'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Routes will be defined here
// Add School API
app.post('/addSchool', async (req, res) => {
    try {
      // Extract school data from request body
      const { name, address, latitude, longitude } = req.body;
      
      // Validate input data
      if (!name || !address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Missing required fields: name, address, latitude, longitude' 
        });
      }
      
      // Validate data types
      if (typeof name !== 'string' || typeof address !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Name and address must be strings' 
        });
      }
      
      if (isNaN(parseFloat(latitude)) || isNaN(parseFloat(longitude))) {
        return res.status(400).json({ 
          success: false, 
          message: 'Latitude and longitude must be valid numbers' 
        });
      }
      
      // Insert school data into database
      const connection = await pool.getConnection();
      const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
      const [result] = await connection.execute(query, [name, address, latitude, longitude]);
      connection.release();
      
      res.status(201).json({
        success: true,
        message: 'School added successfully',
        data: {
          id: result.insertId,
          name,
          address,
          latitude,
          longitude
        }
      });
    } catch (error) {
      console.error('Error adding school:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred while adding school' 
      });
    }
  });

  
// List Schools API
app.get('/listSchools', async (req, res) => {
    try {
      // Extract user coordinates from query parameters
      const { latitude, longitude } = req.query;
      
      // Validate coordinates
      if (!latitude || !longitude) {
        return res.status(400).json({ 
          success: false, 
          message: 'User latitude and longitude are required' 
        });
      }
      
      const userLat = parseFloat(latitude);
      const userLng = parseFloat(longitude);
      
      if (isNaN(userLat) || isNaN(userLng)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid latitude or longitude values' 
        });
      }
      
      // Fetch all schools from database
      const connection = await pool.getConnection();
      const [schools] = await connection.execute('SELECT * FROM schools');
      connection.release();
      
      // Calculate distance for each school and add it to the results
      const schoolsWithDistance = schools.map(school => {
        const distance = calculateDistance(
          userLat, 
          userLng, 
          school.latitude, 
          school.longitude
        );
        
        return {
          ...school,
          distance // Distance in kilometers
        };
      });
      
      // Sort schools by distance (closest first)
      schoolsWithDistance.sort((a, b) => a.distance - b.distance);
      
      res.status(200).json({
        success: true,
        data: schoolsWithDistance
      });
    } catch (error) {
      console.error('Error listing schools:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Server error occurred while listing schools' 
      });
    }
  });
  
  // Function to calculate distance between two points using Haversine formula
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in kilometers
    
    return distance;
  }
  


// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
