-- backend/migrations/create_tables.sql
CREATE DATABASE IF NOT EXISTS unisync;
USE unisync;

-- users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  branch VARCHAR(255),
  year VARCHAR(32),
  division VARCHAR(32),
  cgpa DECIMAL(4,2) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL
);

-- otp_tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  otp_code VARCHAR(16) NOT NULL,
  expires_at DATETIME NOT NULL,
  used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- groups
CREATE TABLE IF NOT EXISTS groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_name VARCHAR(255) NOT NULL,
  type ENUM('branch','division') NOT NULL,
  branch VARCHAR(255),
  year VARCHAR(32),
  division VARCHAR(32),
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- group_members
CREATE TABLE IF NOT EXISTS group_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  is_admin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,
  sender_id INT NOT NULL,
  message_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);

-- skills_master
CREATE TABLE IF NOT EXISTS skills_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- interests_master
CREATE TABLE IF NOT EXISTS interests_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- languages_master
CREATE TABLE IF NOT EXISTS languages_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- user_skills
CREATE TABLE IF NOT EXISTS user_skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_id) REFERENCES skills_master(id) ON DELETE CASCADE
);

-- user_interests
CREATE TABLE IF NOT EXISTS user_interests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  interest_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (interest_id) REFERENCES interests_master(id) ON DELETE CASCADE
);

-- user_languages
CREATE TABLE IF NOT EXISTS user_languages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  language_id INT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (language_id) REFERENCES languages_master(id) ON DELETE CASCADE
);

-- Insert master data
INSERT IGNORE INTO skills_master (name) VALUES
('Communication'),('Teamwork'),('Leadership'),('Problem Solving'),
('Critical Thinking'),('Time Management'),('Creativity'),
('Data Analysis'),('Project Management'),('Machine Learning'),
('UI/UX'),('Cloud Computing');

INSERT IGNORE INTO interests_master (name) VALUES
('Sports'),('Music'),('Dance'),('Coding'),('Reading'),('Volunteering'),
('Photography'),('Startups'),('Gaming'),('Robotics'),('Design');

INSERT IGNORE INTO languages_master (name) VALUES
('C'),('C++'),('Java'),('Python'),('JavaScript'),
('SQL'),('PHP'),('Go'),('Rust'),('Ruby');
