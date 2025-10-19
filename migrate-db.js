const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

console.log('🔧 Migrating database to include country column...');

const db = new sqlite3.Database('./lighthouse_scores.db');

// Check if country column exists
db.all("PRAGMA table_info(lighthouse_scores)", (err, columns) => {
  if (err) {
    console.error('Error checking table structure:', err);
    return;
  }
  
  const hasCountryColumn = columns.some(col => col.name === 'country');
  
  if (!hasCountryColumn) {
    console.log('Adding country column...');
    
    // Add country column
    db.run("ALTER TABLE lighthouse_scores ADD COLUMN country TEXT", (err) => {
      if (err) {
        console.error('Error adding country column:', err);
        return;
      }
      
      console.log('✅ Country column added successfully');
      
      // Update existing records to set country as 'Unknown' where NULL
      db.run("UPDATE lighthouse_scores SET country = 'Unknown' WHERE country IS NULL", (err) => {
        if (err) {
          console.error('Error updating existing records:', err);
        } else {
          console.log('✅ Existing records updated with default country value');
        }
        
        db.close();
        console.log('🎉 Database migration completed!');
      });
    });
  } else {
    console.log('✅ Country column already exists - no migration needed');
    db.close();
  }
});