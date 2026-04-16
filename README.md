 # GenSaaS Recommendation & Risk Assessment System
Final Year Project – Jason O’Sullivan (C22400796)

This project is a full‑stack web application that allows users to create a SaaS founder profile, enter ideas/products/competitors, and generate personalised recommendations, risk assessments, and competitor insights using a local LLM (Ollama).
The system uses Node.js, Express, CouchDB, and Ollama.

# How to Run the System

Ensure CouchDB is installed and running locally.  
If you use CouchDB through Project Fauxton, simply make sure it is running and accessible on http://localhost:5984.

The submitted version does not include node_modules or the .env file, so these must be created before running the system.
1. Install Dependencies
From the root project folder (the folder containing package.json):

 npm install

 2. Install Ollama
Download and install Ollama:

https://ollama.com/download

Then pull the required model (example):

ollama pull llama3

Ensure Ollama is running:

ollama serve

3. Create the .env File
In the root folder, create a file named .env containing:

COUCHDB_URL=http://username:password@localhost:5984


4. Start the Server
From the root folder, run:

node public/expressserver.js


5. Open the Application
Visit:

http://localhost:3000

You can now register a profile, enter details, and generate insights.


