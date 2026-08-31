DROP DATABASE IF EXISTS pathwise_ai;
CREATE DATABASE pathwise_ai;
USE pathwise_ai;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE learner_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    education VARCHAR(150),
    experience_level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    career_goal VARCHAR(200) NOT NULL,
    interests JSON,
    weekly_hours INT DEFAULT 8,
    target_months INT DEFAULT 6,
    learning_preference ENUM('video','reading','project','mixed') DEFAULT 'mixed',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE skills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    description TEXT
);

CREATE TABLE user_skills (
    user_id INT NOT NULL,
    skill_id INT NOT NULL,
    proficiency DECIMAL(5,2) DEFAULT 0,
    last_assessed_at DATETIME NULL,
    PRIMARY KEY(user_id, skill_id),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE career_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT
);

CREATE TABLE goal_skills (
    goal_id INT NOT NULL,
    skill_id INT NOT NULL,
    required_level DECIMAL(5,2) NOT NULL,
    importance DECIMAL(5,2) DEFAULT 1,
    PRIMARY KEY(goal_id, skill_id),
    FOREIGN KEY(goal_id) REFERENCES career_goals(id) ON DELETE CASCADE,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    resource_type ENUM('course','project','assessment','article','video') NOT NULL,
    provider VARCHAR(100),
    url VARCHAR(500),
    difficulty ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    estimated_hours DECIMAL(6,2) DEFAULT 1,
    description TEXT
);

CREATE TABLE resource_skills (
    resource_id INT NOT NULL,
    skill_id INT NOT NULL,
    contribution DECIMAL(5,2) DEFAULT 20,
    PRIMARY KEY(resource_id, skill_id),
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE CASCADE,
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE prerequisites (
    skill_id INT NOT NULL,
    prerequisite_skill_id INT NOT NULL,
    min_level DECIMAL(5,2) DEFAULT 50,
    PRIMARY KEY(skill_id, prerequisite_skill_id),
    FOREIGN KEY(skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY(prerequisite_skill_id) REFERENCES skills(id) ON DELETE CASCADE
);

CREATE TABLE learning_paths (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal VARCHAR(200) NOT NULL,
    status ENUM('active','completed','archived') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE path_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    path_id INT NOT NULL,
    resource_id INT NOT NULL,
    skill_id INT NOT NULL,
    sequence_no INT NOT NULL,
    milestone VARCHAR(150),
    status ENUM('locked','recommended','in_progress','completed') DEFAULT 'recommended',
    reason TEXT,
    FOREIGN KEY(path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
    FOREIGN KEY(resource_id) REFERENCES resources(id),
    FOREIGN KEY(skill_id) REFERENCES skills(id)
);

CREATE TABLE assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    skill_id INT NOT NULL,
    total_marks INT DEFAULT 10,
    FOREIGN KEY(skill_id) REFERENCES skills(id)
);

CREATE TABLE assessment_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    assessment_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    taken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(assessment_id) REFERENCES assessments(id)
);

CREATE TABLE feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    resource_id INT NULL,
    rating INT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(resource_id) REFERENCES resources(id) ON DELETE SET NULL
);

CREATE INDEX idx_user_skills_user ON user_skills(user_id);
CREATE INDEX idx_goal_skills_goal ON goal_skills(goal_id);
CREATE INDEX idx_path_items_path ON path_items(path_id);

INSERT INTO users(name,email) VALUES ('Demo Student','demo@pathwise.ai');

INSERT INTO learner_profiles
(user_id,education,experience_level,career_goal,interests,weekly_hours,target_months,learning_preference)
VALUES
(1,'B.Tech CSE','intermediate','AI/ML Engineer',
 JSON_ARRAY('Artificial Intelligence','Python','Data Science'),10,8,'mixed');

INSERT INTO skills(name,category,description) VALUES
('Python','Programming','Python programming and problem solving'),
('Data Structures','Programming','Core data structures and algorithms'),
('SQL','Database','Relational database querying'),
('Git','Tools','Version control and collaboration'),
('Statistics','Mathematics','Probability and statistics for data science'),
('NumPy','Data Science','Numerical computing in Python'),
('Pandas','Data Science','Data analysis with Python'),
('Machine Learning','AI','Supervised and unsupervised learning'),
('Deep Learning','AI','Neural networks and deep learning'),
('Computer Vision','AI','Image and video understanding'),
('NLP','AI','Natural language processing'),
('System Design','Software','Scalable software architecture'),
('React','Web','Frontend development'),
('Node.js','Web','Backend JavaScript development');

INSERT INTO career_goals(name,description) VALUES
('AI/ML Engineer','Build and deploy machine-learning systems'),
('Software Developer','Build production software and prepare for placements'),
('Full Stack Developer','Build modern frontend and backend applications'),
('Data Scientist','Analyze data and build predictive models');

INSERT INTO goal_skills(goal_id,skill_id,required_level,importance)
SELECT g.id,s.id,90,1.0 FROM career_goals g JOIN skills s ON s.name='Python' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,70,0.8 FROM career_goals g JOIN skills s ON s.name='Statistics' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,75,0.9 FROM career_goals g JOIN skills s ON s.name='NumPy' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,75,0.9 FROM career_goals g JOIN skills s ON s.name='Pandas' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,85,1.0 FROM career_goals g JOIN skills s ON s.name='Machine Learning' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,75,0.9 FROM career_goals g JOIN skills s ON s.name='Deep Learning' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,65,0.7 FROM career_goals g JOIN skills s ON s.name='Computer Vision' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,60,0.7 FROM career_goals g JOIN skills s ON s.name='NLP' WHERE g.name='AI/ML Engineer'
UNION ALL SELECT g.id,s.id,70,0.8 FROM career_goals g JOIN skills s ON s.name='Git' WHERE g.name='AI/ML Engineer';

INSERT INTO goal_skills(goal_id,skill_id,required_level,importance)
SELECT g.id,s.id,90,1.0 FROM career_goals g JOIN skills s ON s.name='Data Structures' WHERE g.name='Software Developer'
UNION ALL SELECT g.id,s.id,85,1.0 FROM career_goals g JOIN skills s ON s.name='Python' WHERE g.name='Software Developer'
UNION ALL SELECT g.id,s.id,80,0.9 FROM career_goals g JOIN skills s ON s.name='SQL' WHERE g.name='Software Developer'
UNION ALL SELECT g.id,s.id,70,0.7 FROM career_goals g JOIN skills s ON s.name='Git' WHERE g.name='Software Developer'
UNION ALL SELECT g.id,s.id,70,0.8 FROM career_goals g JOIN skills s ON s.name='System Design' WHERE g.name='Software Developer';

INSERT INTO goal_skills(goal_id,skill_id,required_level,importance)
SELECT g.id,s.id,85,1.0 FROM career_goals g JOIN skills s ON s.name='React' WHERE g.name='Full Stack Developer'
UNION ALL SELECT g.id,s.id,85,1.0 FROM career_goals g JOIN skills s ON s.name='Node.js' WHERE g.name='Full Stack Developer'
UNION ALL SELECT g.id,s.id,75,0.9 FROM career_goals g JOIN skills s ON s.name='SQL' WHERE g.name='Full Stack Developer'
UNION ALL SELECT g.id,s.id,70,0.7 FROM career_goals g JOIN skills s ON s.name='Git' WHERE g.name='Full Stack Developer';

INSERT INTO goal_skills(goal_id,skill_id,required_level,importance)
SELECT g.id,s.id,85,1.0 FROM career_goals g JOIN skills s ON s.name='Python' WHERE g.name='Data Scientist'
UNION ALL SELECT g.id,s.id,90,1.0 FROM career_goals g JOIN skills s ON s.name='Statistics' WHERE g.name='Data Scientist'
UNION ALL SELECT g.id,s.id,85,0.9 FROM career_goals g JOIN skills s ON s.name='Pandas' WHERE g.name='Data Scientist'
UNION ALL SELECT g.id,s.id,80,0.9 FROM career_goals g JOIN skills s ON s.name='Machine Learning' WHERE g.name='Data Scientist'
UNION ALL SELECT g.id,s.id,75,0.8 FROM career_goals g JOIN skills s ON s.name='SQL' WHERE g.name='Data Scientist';

INSERT INTO prerequisites(skill_id,prerequisite_skill_id,min_level)
SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='Machine Learning' AND p.name='Python'
UNION ALL SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='Machine Learning' AND p.name='Statistics'
UNION ALL SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='NumPy' AND p.name='Python'
UNION ALL SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='Pandas' AND p.name='Python'
UNION ALL SELECT s.id,p.id,70 FROM skills s JOIN skills p WHERE s.name='Deep Learning' AND p.name='Machine Learning'
UNION ALL SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='Computer Vision' AND p.name='Deep Learning'
UNION ALL SELECT s.id,p.id,60 FROM skills s JOIN skills p WHERE s.name='NLP' AND p.name='Deep Learning';

INSERT INTO resources(title,resource_type,provider,url,difficulty,estimated_hours,description) VALUES
('Python Foundations','course','PathWise Academy','https://docs.python.org/3/tutorial/','beginner',15,'Core Python syntax and problem solving'),
('Data Structures & Algorithms','course','PathWise Academy','https://leetcode.com/','intermediate',35,'DSA practice and coding problems'),
('SQL Fundamentals','course','PathWise Academy','https://www.w3schools.com/sql/','beginner',12,'SQL queries, joins and aggregation'),
('Git & GitHub Essentials','course','PathWise Academy','https://git-scm.com/docs','beginner',6,'Version control and collaboration'),
('Statistics for Machine Learning','course','PathWise Academy','https://www.khanacademy.org/math/statistics-probability','intermediate',20,'Probability and statistics'),
('NumPy Essentials','course','PathWise Academy','https://numpy.org/learn/','beginner',8,'Numerical computing'),
('Pandas for Data Analysis','course','PathWise Academy','https://pandas.pydata.org/docs/','beginner',10,'Data wrangling'),
('Machine Learning Fundamentals','course','PathWise Academy','https://scikit-learn.org/stable/user_guide.html','intermediate',30,'ML algorithms and evaluation'),
('Deep Learning with Neural Networks','course','PathWise Academy','https://www.tensorflow.org/learn','advanced',35,'Neural networks'),
('Computer Vision Project','project','PathWise Academy','https://opencv.org/','advanced',25,'Build an image classifier'),
('NLP Mini Project','project','PathWise Academy','https://huggingface.co/learn','advanced',20,'Build a text classifier'),
('ML Model Evaluation Assessment','assessment','PathWise Academy',NULL,'intermediate',1,'Test model evaluation concepts'),
('AI Portfolio Project','project','PathWise Academy',NULL,'advanced',40,'End-to-end deployed ML project');

INSERT INTO resource_skills(resource_id,skill_id,contribution)
SELECT r.id,s.id,40 FROM resources r JOIN skills s WHERE r.title='Python Foundations' AND s.name='Python'
UNION ALL SELECT r.id,s.id,35 FROM resources r JOIN skills s WHERE r.title='Data Structures & Algorithms' AND s.name='Data Structures'
UNION ALL SELECT r.id,s.id,40 FROM resources r JOIN skills s WHERE r.title='SQL Fundamentals' AND s.name='SQL'
UNION ALL SELECT r.id,s.id,50 FROM resources r JOIN skills s WHERE r.title='Git & GitHub Essentials' AND s.name='Git'
UNION ALL SELECT r.id,s.id,50 FROM resources r JOIN skills s WHERE r.title='Statistics for Machine Learning' AND s.name='Statistics'
UNION ALL SELECT r.id,s.id,60 FROM resources r JOIN skills s WHERE r.title='NumPy Essentials' AND s.name='NumPy'
UNION ALL SELECT r.id,s.id,60 FROM resources r JOIN skills s WHERE r.title='Pandas for Data Analysis' AND s.name='Pandas'
UNION ALL SELECT r.id,s.id,70 FROM resources r JOIN skills s WHERE r.title='Machine Learning Fundamentals' AND s.name='Machine Learning'
UNION ALL SELECT r.id,s.id,70 FROM resources r JOIN skills s WHERE r.title='Deep Learning with Neural Networks' AND s.name='Deep Learning'
UNION ALL SELECT r.id,s.id,65 FROM resources r JOIN skills s WHERE r.title='Computer Vision Project' AND s.name='Computer Vision'
UNION ALL SELECT r.id,s.id,65 FROM resources r JOIN skills s WHERE r.title='NLP Mini Project' AND s.name='NLP'
UNION ALL SELECT r.id,s.id,70 FROM resources r JOIN skills s WHERE r.title='ML Model Evaluation Assessment' AND s.name='Machine Learning'
UNION ALL SELECT r.id,s.id,80 FROM resources r JOIN skills s WHERE r.title='AI Portfolio Project' AND s.name='Machine Learning';

INSERT INTO assessments(title,skill_id,total_marks)
SELECT 'ML Model Evaluation Assessment',id,10 FROM skills WHERE name='Machine Learning';

INSERT INTO user_skills(user_id,skill_id,proficiency)
SELECT 1,id,65 FROM skills WHERE name='Python'
UNION ALL SELECT 1,id,45 FROM skills WHERE name='Statistics'
UNION ALL SELECT 1,id,20 FROM skills WHERE name='NumPy'
UNION ALL SELECT 1,id,15 FROM skills WHERE name='Pandas'
UNION ALL SELECT 1,id,10 FROM skills WHERE name='Machine Learning'
UNION ALL SELECT 1,id,0 FROM skills WHERE name='Deep Learning'
UNION ALL SELECT 1,id,30 FROM skills WHERE name='Git';
