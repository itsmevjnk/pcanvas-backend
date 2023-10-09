# Backend for pCanvas

This is the backend server for [pCanvas](https://github.com/itsmevjnk/pcanvas).

## Getting started

Clone this repository:

```
git clone https://github.com/itsmevjnk/pcanvas-backend.git
```

Then enter the repository's root directory and install dependencies:

```
cd pcanvas-backend
npm install
```

A MySQL (or its compatible) server with a database is also needed. Set up an user account and a database with full access for the backend, and populate the database following the `db_setup.sql` file in the repository's root.

To configure the backend to use the aforementioned server and database, create a new `.env.local` file in the repository's root following this template:

```
DB_HOST=YOUR_DB_HOST_ADDRESS
DB_USER=YOUR_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_SCHEMA=YOUR_DB_NAME
```

Optionally, the `DB_PREFIX` variable needs to be specified if the database table name prefix used is not `pc_`; however, if you are strictly following the `db_setup.sql` file, you do not need to worry about it.

## Usage

```
node index.js
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
