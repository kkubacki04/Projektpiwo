#  BeerBuddy Kraków (Projekt Piwo)

A modern, interactive web application designed to help people in Kraków find company for a beer. Users can locate bars, pubs, and clubs on an interactive map, organize meetings, and join existing ones matching with people that share their interests. 

##  Key Features
* **Interactive Map:** Integration with Leaflet to display venues and user-generated meetings across Kraków.
* **Meeting Management:** Users can create new meetings at specific venues, join existing ones, and see live participant lists.
* **User Profiles:** Authentication system with customizable user profiles (avatars, descriptions, relationship status).
* **Media Tracking:** Users can save and manage their favorite movies and music directly on their profiles(TMBD API, Spotify API).
* **Real-time Database:** Powered by Supabase to handle complex relational data and user sessions.

## Tech Stack
* **Frontend:** React.js, React Router, Bootstrap / CSS
* **Map Integration:** Leaflet (`react-leaflet`)
* **Backend & Auth:** Supabase (PostgreSQL, Supabase Auth)
* **Deployment:** Vercel

##  Database Architecture & Security
This project uses a robust relational database hosted on **Supabase (PostgreSQL)**. Key backend features include:
* **Custom SQL Triggers:** Automated processes, such as automatically adding the creator of a meeting to the `meeting_participants` table using PL/pgSQL functions.
* **Row Level Security (RLS):** Strict security policies ensuring users can only edit or delete their own data (profiles, favorite media, meetings).
* **Relational Schema:** Efficiently structured tables with foreign key constraints linking users, profiles, meetings, and participants.

> **Note:** The complete database architecture, including schemas, functions, and RLS policies, is documented in the `schema.sql` file included in this repository. SerpAPI script to scrape google maps data file included in this this repository.

##  How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/kkubacki04/projektpiwo.git](https://github.com/kkubacki04/projektpiwo.git)
   
2. Install dependencies:

    ```bash
    npm install

3. Set up environment variables:
Create a .env file in the root directory and add your Supabase keys:
    ```bash
    REACT_APP_SUPABASE_URL=your_supabase_url
    REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

4. Start the development server:

    ```bash
    npm start

Or see it live under the link: https://projektpiwo.vercel.app/ Test Account: testcvkowalski1234@gmail.com Password: 123456