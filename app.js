const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

var session = require("express-session");
app.use(session({ secret: "ONTERI" }));

const mongoose = require("mongoose");

const bcrypt = require("bcrypt");
const saltRounds = 10;

const handlebars = require("express-handlebars");
// environment varaibles
require("dotenv").config();

const modelData = require("./models/data");
const mail = require("./services/mail");

const User = require("./models/users");

var ssn;

app.use(express.static("public"));

app.set("view engine", "hbs");

// extract data from form in the POST request body.
app.use(express.urlencoded({ extended: true }));

app.engine(
  "hbs",
  handlebars({
    layoutsDir: __dirname + "/views/layouts",
    extname: "hbs",
    defaultLayout: "main",
    helpers: {
      block: function (name) {
        var blocks = this._blocks,
          content = blocks && blocks[name];

        return content ? content.join("\n") : null;
      },

      contentFor: function (name, options) {
        var blocks = this._blocks || (this._blocks = {}),
          block = blocks[name] || (blocks[name] = []);

        block.push(options.fn(this));
      },
    },
  })
);

// HOME
function getFoodList() {
  return modelData.topMeals;
}

app.get("/", function (req, res) {
  var conte = {
    foodList: getFoodList(),
    menuListExists: true,
  };
  if (ssn && ssn.user) {
    conte.firstName = ssn.user.firstName;
    conte.lastName = ssn.user.lastName;
  }

  res.render("home", conte);
});

// PACKAGE LISTING
app.get("/package-listing", function (req, res) {
  res.render("package-listing", { topMealPackages: modelData.topMealPackages });
});

// PRODUCT DETAIL
app.get("/product", function (req, res) {
  res.render("product-detail");
});

// LOGIN
app.get("/login", function (req, res) {
  res.render("login");
});

// LOGOUT
app.get("/logout", function (req, res) {
  ssn.user = null;
  res.redirect("/");
});

app.post("/login", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  var usernameError = false;
  var failed = false;
  var usernameErrorMessage = "";
  var passwordError = false;
  var passwordErrorMessage = "";

  if (username) {
    // validation
  } else {
    usernameError = true;
    failed = true;
    usernameErrorMessage = "Username cannot be blank!";
  }

  if (password) {
    // validation
  } else {
    passwordError = true;
    failed = true;
    passwordErrorMessage = "Password cannot be blank!";
  }

  // Handle Errors
  if (usernameError || passwordError) {
    //
    console.log("Error");

    res.render("login", {
      extraFormClasses: "invalid-form",
      username: username,
      usernameError: usernameError,
      usernameErrorMessage: usernameErrorMessage,
      password: password,
      passwordError: passwordError,
      passwordErrorMessage: passwordErrorMessage,
    });
    res.end();
    return;
  } else {
    User.findOne({ username: username })
      .then((u) => {
        bcrypt.compare(password, u.password, function (error, response) {
          if (response == true) {
            ssn = req.session;
            ssn.user = u;
            res.redirect("/");
            return;
          }
          // else wrong password
          failed = true;
        });
      })
      .catch((err) => {
        failed = true;
        console.log(err);
      });
  }
  if (failed) {
    res.render("login", { ERROR: true });
  }
});

// REGISTER
app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", function (req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const email = req.body.email;
  var isClerk = false;
  var usernameError = false;
  var usernameErrorMessage = "";
  var passwordError = false;
  var passwordErrorMessage = "";
  var firstNameError = false;
  var firstNameErrorMessage = "";
  var lastNameError = false;
  var lastNameErrorMessage = "";
  var emailError = false;
  var emailErrorMessage = "";

  if (username) {
    usernameReg = RegExp(/^[a-z0-9_-]{4,12}$/);
    if (!usernameReg.test(username)) {
      usernameError = true;
      usernameErrorMessage =
        "Username must be between 4-12 characters & Can only contain letters, numbers, dashes or underscores!";
    }
  } else {
    usernameError = true;
    usernameErrorMessage = "Username cannot be blank!";
  }

  if (password) {
    passwordReg = RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/);
    if (!passwordReg.test(password)) {
      passwordError = true;
      passwordErrorMessage =
        "Password must contain a minimum eight characters, at least one letter and one number!";
    }
  } else {
    passwordError = true;
    passwordErrorMessage = "Password cannot be blank!";
  }

  if (firstName) {
    //
  } else {
    firstNameError = true;
    firstNameErrorMessage = "First Name cannot be blank!";
  }

  if (lastName) {
    //
  } else {
    lastNameError = true;
    lastNameErrorMessage = "Last Name cannot be blank!";
  }

  if (email) {
    emailReg = RegExp(
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/gm
    );
    if (!emailReg.test(email)) {
      emailError = true;
      emailErrorMessage = "Invalid email!";
    }
  } else {
    emailError = true;
    emailErrorMessage = "Email cannot be blank!";
  }

  // Handle Errors
  if (
    usernameError ||
    passwordError ||
    emailError ||
    firstNameError ||
    lastNameError
  ) {
    res.render("register", {
      extraFormClasses: "invalid-form",
      username: username,
      usernameError: usernameError,
      usernameErrorMessage: usernameErrorMessage,
      email: email,
      emailError: emailError,
      emailErrorMessage: emailErrorMessage,
      password: password,
      passwordError: passwordError,
      passwordErrorMessage: passwordErrorMessage,
      firstName: firstName,
      firstNameError: firstNameError,
      firstNameErrorMessage: firstNameErrorMessage,
      lastName: lastName,
      lastNameError: lastNameError,
      lastNameErrorMessage: lastNameErrorMessage,
    });
  } else {
    bcrypt.genSalt(saltRounds, (err, salt) => {
      bcrypt.hash(password, salt, (err, hash) => {
        // Now we can store the password hash in db.
        if (hash) {
          user = new User({
            _id: new mongoose.Types.ObjectId(),
            username: username,
            password: hash,
            firstName: firstName,
            lastName: lastName,
            email: email,
            isClerk: isClerk,
          });
          user
            .save()
            .then((obj) => {
              console.log("User created");
              console.log(obj);
              // mail.sendEmail(email);
              res.redirect("/");
            })
            .catch((err) => {
              console.log(err);
            });
        } else {
          // error handling
          res.end();
        }
      });
    });
  }
  //
});

mongoose
  .connect(
    "mongodb+srv://test:test@cluster0.lf0dg.gcp.mongodb.net/testdb?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(port, () =>
      console.log(`App listening to port http://localhost:${port}`)
    );
  })
  .catch((err) => {
    console.log(err);
    console.log("Error");
  });

mongoose.connection.on("connected", () => {
  console.log("Mongoose is connected!!!!");
});
