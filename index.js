const express = require('express'); 
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const { error } = require('console');
const { ifError } = require('assert');

const app = express();

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs');

app.use(session({ 
  secret: '68743b',
  resave: false,
  saveUninitialized: true

  
}));

app.use(express.json());


const jsonFilePath = path.join(__dirname, 'data', 'accounts.json');
const gamesFilePath = path.join(__dirname, 'data', "games.json");
const raFilePath = path.join(__dirname, 'data', 'ra.json')
const reportsFilePath = path.join(__dirname, 'data', 'reports.json')










app.use(express.static(path.join(__dirname, 'views')))
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', function(req, res) {
  if (req.session.username) {
      res.redirect('/user');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'))
});


app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
          return console.log(err);
        }
        res.redirect('/');
    });
});


app.get('/register', function(req, res) {
  if (req.session.username) {
      res.redirect('/user');
  }
  res.sendFile(path.join(__dirname, 'views', 'register.html'))
  
});


app.post('/registerAttempt', function(req, res) {
  const username = req.body.username;
  const password = req.body.password;
  const ReTypePassword = req.body.ReTypePassword;

   fs.readFile(jsonFilePath, 'utf8', (err, data) => {

     if (err) {
       console.log(err)
       return res.redirect('/register') 
     }

     let accounts;
     try {
       accounts = JSON.parse(data);
     } catch (parseErr) {
       console.error('Error parsing JSON data:', parseErr);
       return res.redirect('/register');
    
     }
     if (accounts[username]) {
       return res.redirect('/register');
     }

     if (password !== ReTypePassword) {
       return res.redirect('/register')
     }
     accounts[username] = password;

     fs.writeFile(jsonFilePath, JSON.stringify(accounts, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing JSON file:')
        return res.redirect('/register');
            
      }

       console.log('ARS')
       return res.redirect('/');
       
       
      });
     
   });

});


app.post("/loginAttempt", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  fs.readFile(jsonFilePath, 'utf8', (err, data) => {

    if (err) {
      console.log(err)
      return res.redirect('/') 
    }

    try {
      const accounts = JSON.parse(data);

      if (accounts[username] === password) {
        req.session.username = username;
        return res.redirect('/user');
        
      }else{
        return res.redirect('/register');
      }

      
    } catch (parseErr) {
      console.log(parseErr) 
      return res.redirect('/');

      
    }

    
  });


  
});

        
      
app.get('/user', function(req, res) {
  username = req.session.username;
  if (!username) {
    return res.redirect('/')
  }
  const raData = fs.readFileSync(raFilePath, 'utf-8')
  const raParsedData = JSON.parse(raData).slice(0, 10);
  res.render('user', { username: username, raData: raParsedData });

    
});       







app.get('/mygames', function(req, res) {
  username = req.session.username;
  if (!username) {
     return res.redirect('/')
  }

  fs.readFile(gamesFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading JSON file:', err);
      return res.redirect("/user")
      
    }

    try {
      const games = JSON.parse(data);
      res.render('mygames', {games: games, username: username });
      
    } catch (err) {
      console.error('Error parsing JSON:', err);
      return res.redirect('/user');
    }


  });       
});



app.get('/game/:username/:gameId', function(req, res) {


  fs.readFile(gamesFilePath, 'utf8', (err, data) => {
    const games = JSON.parse(data);
    console.log(games)
    const username = req.params.username;
    const gameId = req.params.gameId;
    let game = null
 
    for (let i = 0; i < games[username].length; i++) {
      if (games[username][i][0] === gameId) {
        game = games[username][i];
        break;
      }
    }

    if (!game) {
      return res.status(404).send('Game not found!');
    }

    res.render('game', { game : game, username : username });
  });

});       





app.get("/addGamePage", function(req, res) {
  username = req.session.username;
  if (!username) {
    return res.redirect('/')
  }
  res.render("addGamePage")
})


app.get("/removeGamePage", function(req, res) {
  username = req.session.username;
  if (!username) {
    return res.redirect('/')
  }
  res.render("removeGamepage")
})




app.post('/addGame', function(req,res) {
  const { name, link } = req.body;
  const username = req.session.username;
  const jsonData = fs.readFileSync(gamesFilePath, 'utf-8');
  const data = JSON.parse(jsonData)

  
  if (!data[username]) {
    data[username] = [];
  }
  const gameExists = data[username].some(game => game [0] === name);
  if (gameExists) {
    return res.status(400).send(" err 400 name tokens already used if you want to use it delete the game first")
  }
  


  
  data[username].push([name, link]);


  
  fs.writeFileSync(gamesFilePath, JSON.stringify(data, null, 2),'utf-8');
  const raData = fs.readFileSync(raFilePath, 'utf-8')
  const raParsedData = JSON.parse(raData)
  const newGameEntry = { [username]: [name, link]}
  raParsedData.unshift(newGameEntry);
  fs.writeFileSync(raFilePath, JSON.stringify(raParsedData, null, 2), 'utf-8')

    
  res.redirect("/mygames")
});






function deletegameFromRA(username, name) {
  try {
    const raData = fs.readFileSync(raFilePath, 'utf-8')
    const raParedData = JSON.parse(raData);
    let userIndexToDelete = -1;
    for (let i = 0; i < raParedData.length; i++) {
      const userEntry = raParedData[i];
      if (userEntry.hasOwnProperty(username)) {
        const gamesArray = userEntry[username];
        const gameIndex = gamesArray.findIndex(game => game === name);
        if (gameIndex !==-1) {
          raParedData.splice(i, 1);
          userIndexToDelete = i
          break;
        } else {
          console.log(`Game "${name}" not found for user "${username}".`);
        }
        
        
      }
    }

    if(userIndexToDelete !== -1) {
      fs.writeFileSync(raFilePath, JSON.stringify(raParedData, null, 2));
    } else {
      console.log(`user "${username}" not found`);
    }
    
    
  } catch (err) {
    console.error('ERROR trying to delete game From RA', err);

  }
}




app.post('/removeGame',function(req, res) {

  const { name } = req.body;
  const username = req.session.username; 

  deletegameFromRA(username, name)
  
  fs.readFile(gamesFilePath, 'utf8',(err, data) => {
    if (err) {
      return res.status(500).json({error: 'error reading file'});
    }
    const gameData = JSON.parse(data);
    if (gameData[username]) {
      const updatedGames = [];
      for (const game of  gameData[username]){ 
        if (game[0] !== name) {
          updatedGames.push(game);
        }

        
      }
      gameData[username] = updatedGames;
      
      
    } else {
      return res.status(404).json({ error: 'User not found'});
    }
    fs.writeFile(gamesFilePath,JSON.stringify(gameData,null,2), (writeErr) =>{
      if (writeErr) {
        return res.status(500).json({ error: 'Error writing file'})
      }
      res.redirect("/mygames")
    });


    
  });
  
  
});



app.post('/report',(req, res) => {

  reportData = req.body
  console.log(reportData)
  fs.readFile(reportsFilePath, 'utf8', (err, data) => {

    let reports = [];
    if (err) {
      return res.status(500).send('err reading file')
    }
    if (data) {
      reports = JSON.parse(data);
    }
    reports.push(reportData);
    fs.writeFile(reportsFilePath, JSON.stringify(reports, null, 2), (err) => {

      if (err) {
        return res.status(500).send('err saving report')

      }
      res.status(200).send('report saved')
      
    });
    
    
  });

})


app.get('/search',function(req,res) {

  res.render('search');

});









app.get('/find', function(req, res) {
  const query = req.query.q;
  console.log(query)

  // grab list of games simler to Q

  fs.readFile(raFilePath, 'utf8', (err, data) => {
    if (err) {
      console.log(err)
    }
    try{
      const jsondata = JSON.parse(data);
      const results = [];
      jsondata.forEach(item => {
        const key = Object.keys(item)[0];
        const [gameName, gameLink] = item[key];
        if (
          gameName.toLowerCase().includes(query.toLowerCase())

        ) {
          results.push({
            username: key,
            gameName,
            gameLink

          });

        }

        
      });

      console.log (results)
      res.json(results)
      

    } catch (error){
      console.log(error)
      res.json([])

    }

  });



});















const PORT = process.env.PORT || 8080;
app.listen(PORT, function() {
  console.log(`server is running on http://localhost;${PORT}`);  
});





