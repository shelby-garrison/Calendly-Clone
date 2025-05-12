
# Calendly Clone

A full-stack clone of Calendly that allows users to schedule and manage meetings efficiently. This project replicates the core functionality of Calendly, providing an intuitive UI and seamless time-slot booking features.

> Built with Node.js, Express, MongoDB, EJS, and Tailwind CSS.

---

## 🛠️ Features

- 🔐 **User Authentication**  
  Register and log in with secure password hashing.

- 📆 **Event Scheduling**  
  Create custom meeting types and define available time slots.

- 🕒 **Booking System**  
  Share booking links with others who can view your availability and book meetings.

- 📧 **Email Notifications**  
  Confirmation emails sent to both host and invitee upon successful booking.

- 📋 **Event Dashboard**  
  View, edit, or delete your scheduled events from a clean dashboard.

- 🖼️ **Responsive UI**  
  Mobile-friendly design using Tailwind CSS.

---

## ⚙️ Setup Instructions

### 1. Clone the Repository
```bash
git clone https://github.com/shelby-garrison/Calendly-Clone.git
cd Calendly-Clone
````

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory and add:

```env
PORT=3000
MONGODB_URI=your_mongo_uri
SESSION_SECRET=your_session_secret_here
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
HUBSPOT_CLIENT_ID=hubspot_id
HUBSPOT_CLIENT_SECRET=hubspot_secret
OPENAI_API_KEY=api_key
```
### 4. Run the App

```bash
npm start
```

Then visit: [http://localhost:3000/auth/login](http://localhost:3000/auth/login)

---

## 🗃️ Tech Stack

* **Backend:** Node.js, Express.js
* **Frontend:** EJS, Tailwind CSS
* **Database:** MongoDB with Mongoose
* **Authentication:** express-session, bcrypt
* **Email Service:** nodemailer

---

## 📌 Future Enhancements
* Availability Buffer Logic
* Timezone Support
* Booking Cancellation/Rescheduling
* Admin Panel for Analytics
---
