# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FerryTransit is a ferry timetable and route information system for the Oki Islands (隠岐諸島) in Shimane Prefecture, Japan. The application displays ferry schedules between various ports and supports both Japanese and English languages.

## Technology Stack

- **Frontend**: AngularJS 1.7.9 (legacy version)
- **Language**: TypeScript (compiles to ES5)
- **UI**: Bootstrap 3.4.1 with Angular UI Bootstrap
- **Data Storage**: SQLite database exported to JSON
- **Server**: PHP for serving JSON with CORS headers

## Development Commands

Since there are no npm scripts defined, development follows manual processes:

### TypeScript Compilation
TypeScript files are configured to compile on save. The project uses:
- `js/controller.ts` → `js/controller.js`
- `js/timepicker-ctrl.ts` → `js/timepicker-ctrl.js`

### Data Updates
To update ferry timetable data:
```bash
# Edit SQL commands in update_timetable.sql
# Run the update script
./update_timetable.sh
```

The update process:
1. Imports CSV data into SQLite database
2. Exports data to `timetable.json`
3. The PHP endpoint serves this JSON file

## Architecture Overview

### Data Flow
1. **Source Data**: Ferry schedule information stored in `timetable.sqlite`
2. **Data Export**: SQLite → JSON via `update_timetable.sh`
3. **API**: `timetable.php` serves JSON with CORS headers
4. **Frontend**: AngularJS controller fetches and displays data

### Core Components

**Main Controller (`js/controller.ts`)**
- Manages ferry schedule display
- Handles language switching (ja/en)
- Implements date-based filtering
- Controls modal dialogs for port/ship information

**Data Structure**
The timetable data includes:
- Port connections (SAIGO, HISHIURA, BEPPU, KURI, HONDO_SHICHIRUI, HONDO_SAKAIMINATO)
- Ferry services (FERRY_OKI, FERRY_SHIRASHIMA, FERRY_KUNIGA, FERRY_DOZEN)
- Schedule information with dates and times
- Service alerts and exceptions

### Key Features Implementation
- **Multi-language**: Uses Angular Translate with language files in the controller
- **Date Filtering**: Custom date picker implementation for schedule filtering
- **Map Integration**: Google Maps API for displaying port locations
- **Responsive Design**: Bootstrap-based layout for mobile compatibility

## Important Considerations

1. **Legacy Framework**: This uses AngularJS 1.x which is no longer actively maintained
2. **Manual Data Updates**: Schedule updates require manual SQL editing and script execution
3. **CORS Configuration**: The PHP endpoint includes CORS headers for cross-origin requests
4. **Date Handling**: Japanese calendar considerations and timezone handling are important