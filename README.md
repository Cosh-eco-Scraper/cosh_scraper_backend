# Cosh Scraper Backend

## description
This project conatins the scraper, LLM and other logic needed to build the tool for cosh.
## Setup

### development

* to run a development server you need to run `npm i` and 
* then you need to start the dev server via `npm run dev`
* you can access swagger ui via http://localhost:3001/api-docs
* to run the databse run `docker compose --profile development up --build -d`

### production

* to run production, first download the latest image from github then run `docker compose --profile production up --build -d`