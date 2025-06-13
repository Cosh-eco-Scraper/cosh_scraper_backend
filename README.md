# Cosh Scraper Backend

## Authors:

- Liam Omen
- Rafik Anamse
- Matteo Boulanger
- Aaron Abbey

## description

This project encompasses a backend system that combines web scraping capabilities with Large Language Models (LLM) to
gather and process fashion retailer data for Cosh. The system is designed to automatically extract and analyze
information about stores, their opening hours, brands, and sustainability practices.

Key Features:

- Web scraping functionality to collect store information
- Integration with LLM for data processing and analysis
- REST API endpoints for managing store data
- Database storage for structured retail information
- Docker containerization for easy deployment

The backend serves as the data processing engine that powers Cosh's platform for promoting sustainable fashion retail,
facilitating quick and automated store registration through web scraping and AI-powered data extraction, reducing manual
input requirements for store owners.

## Setup

### development

- to run a development server you need to run `npm i` and
- then you need to start the dev server via `npm run dev`
- you can access swagger ui via http://localhost:3001/api-docs
- to run the databse run `docker compose --profile development up --build -d`

### production

- to run production, first download the latest image from github then run `docker compose --profile production up --build -d` this will run your docker desktop
- if you would run teh action command in [infra](https://github.com/Cosh-eco-Scraper/Infra/actions/workflows/update-deploy.yml) then this deploys the latest images create of frontend and backend to our render server
- if you like to run de production server yourself you can do `npm run build` and then `npm run start`, these two command wil first build the project for you and run it in production on your personal computer.

### Environment variables

This project uses a lot of variables, these need to be configured in a .env file, we have made an [example file](./.env.example) with dummy data so it is easy to copy paste. You can use these environment variables where you like them to be injected in your code.
