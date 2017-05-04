const jQuery = require('jquery')
const _ = require('lodash')
const autosize = require('textarea-autosize')
const url = require('url')
const PouchDB = require('pouchdb-browser')
const React = require('react')
const ReactDOM = require('react-dom')
const CommitsGraph = require('react-commits-graph')

const shared = require('../shared/shared')
window.Elm = require('../elm/Main')



/* === Global Variables === */

var field = null
var editing = null
var blankAutosave = null
var currentSwap = null
var saved = true
var lastCenterline = null
var lastColumnIdx = null


/* === Initializing App === */


self.gingko = Elm.Main.fullscreen(null)


/* === Database === */

var db = new PouchDB('atreenodes16')
var remoteCouch = 'http://localhost:5984/atreenodes16'

shared.loadModel(db, function(data) {
  data = data.map(r => r.doc)
  console.log('toLoad', data)

  var processData = function (data, type, toDict) {
    var processed = data.filter(d => d.type === type).map(d => _.omit(d, ['type','_rev']))
    if (toDict) {
      var dict = {}
      processed = processed.map(d => dict[d._id] = _.omit(d, '_id'))
      return dict
    } else {
      return processed
    }
  }

  var commits = processData(data, "commit", true);
  console.log('commits',commits);
  var trees = processData(data, "tree", true);
  var head = processData(data, "head", false)[0];
  var toSend = { commits: commits, treeObjects: trees, head: head };
  console.log('toSend', toSend);
  gingko.ports.objects.send(toSend);
})




/* === From Main process to Elm === */


/* === Elm Ports === */

gingko.ports.activateCards.subscribe(actives => {
  shared.scrollHorizontal(actives[0])
  shared.scrollColumns(actives[1])
})


gingko.ports.getText.subscribe(id => {
  var tarea = document.getElementById('card-edit-'+id)

  if (tarea === null) {
    gingko.ports.updateError.send('Textarea with id '+id+' not found.')
  } else {
    gingko.ports.updateContent.send([id, tarea.value])
  }
})


gingko.ports.saveObjects.subscribe(objects => {
  renderCommits(objects.commits, objects.head.current)
  
  db.get(objects.head._id)
    .catch(function(err) {
      if (err.name === 'not_found') {
        return objects.head
      } else {
        throw err;
      }
    })
    .then(function(headDoc) {
      headDoc.current = objects.head.current;
      headDoc.previous = objects.head.previous;

      var toSave = objects.commits.concat(objects.treeObjects).concat(headDoc);
      console.log('toSave', toSave)
      db.bulkDocs(toSave)
        .then(responses => {
          var toSend = responses//.map( (r, i) => [r, toSave[i]])
          console.log('saveResponses', toSend)
          //gingko.ports.saveResponses.send(toSend)
        }).catch(err => {
          console.log(err)
        })
    })
})


var renderCommits = function(commits, selected) {
  commits = _.sortBy(commits, 'timestamp').reverse().map(c => { return {sha: c._id, parents: c.parents}})
  console.log('commits sorted', commits)

  var commitElement = React.createElement(CommitsGraph, {
    commits: commits,
    selected: selected
  });

  ReactDOM.render(commitElement, document.getElementById('history'))
}



/* === Local Functions === */

var setTitleFilename = function(filepath) {
  document.title =
    filepath ? `Gingko - ${path.basename(filepath)}` : "Gingko - Untitled"
}

setSaved = bool => {
  saved = bool
  if (bool) { 
    if(isNaN(saveCount)) {
      saveCount = 1
    } else {
      saveCount++
    }

    localStorage.setItem('saveCount', saveCount)
    window.Intercom('update', {"save_count": saveCount})
    maybeRequestPayment() 
  } else {
    document.title = 
      /\*/.test(document.title) ? document.title : document.title + "*"
  }
}

save = (model, success, failure) => {
}

// Special handling of exit case
// TODO: Find out why I can't pass app.exit as
// success callback to regular save function
saveAndExit = (model) => {
}

autosave = function(model) {
}


unsavedWarningThen = (model, success, failure) => {
}

exportToJSON = (model) => {
}

exportToMarkdown = (model) => {
}

attemptLoadFile = filepath => {
}

loadFile = (filepath, setpath) => {
}

importFile = filepath => {
}

newFile = function() {
  setTitleFilename(null)
  gingko.ports.data.send(null)
}

openDialog = function() { // TODO: add defaultPath
}

importDialog = function() {
}

clearSwap = function(filepath) {
  var file = filepath ? filepath : currentSwap
  fs.unlinkSync(file)
}

toFileFormat = model => {
  if (field !== null) {
    model = _.extend(model, {'field': field})
  } 
  return JSON.stringify(_.omit(model, 'filepath'), null, 2)
}


/* === Payment Request Functions === */

maybeRequestPayment = () => {
  var t = Date.now()
  if (  isTrial
     && (saveCount > 10)
     && (isNaN(lastRequestTime) || t - lastRequestTime > 3.6e6)
     && (Math.random() < freq(t-firstRunTime))
     )
    {
      lastRequestTime = t

      if(isNaN(requestCount)) {
        requestCount = 1;
      } else {
        requestCount++
      }
      window.Intercom('update', { "request_count": requestCount })
      localStorage.setItem('requestCount', requestCount)
      localStorage.setItem('lastRequestTime', t)
    }
}

freq = tau => {
  if (tau <= 7*24*3.6e6) {
    return 0.1
  } else if (tau <= 30*24*3.6e6) {
    return 0.5
  } else {
    return 0.8
  }
}


/* === DOM Events and Handlers === */

document.ondragover = document.ondrop = (ev) => {
  ev.preventDefault()
}

document.body.ondrop = (ev) => {
  //saveConfirmAndThen(attemptLoadFile(ev.dataTransfer.files[0].path))
  ev.preventDefault()
}

window.onresize = () => {
  if (lastCenterline) { scrollColumns(lastCenterline) }
  if (lastColumnIdx) { scrollHorizontal(lastColumnIdx) }
}


editingInputHandler = function(ev) {
  if (saved) {
    setSaved(false)
  }
  field = ev.target.value
}



Mousetrap.bind(shared.shortcuts, function(e, s) {
  gingko.ports.keyboard.send(s);

  if(shared.needOverride.includes(s)) {
    return false;
  }
});


Mousetrap.bind(['tab'], function(e, s) {
  document.execCommand('insertText', false, '  ')
  return false;
});

Mousetrap.bind(['shift+tab'], function(e, s) {
  return true;
});


/* === DOM manipulation === */



var observer = new MutationObserver(function(mutations) {
  var isTextarea = function(node) {
    return node.nodeName == "TEXTAREA" && node.className == "edit mousetrap"
  }

  var textareas = [];

  mutations
    .map( m => {
          [].slice.call(m.addedNodes)
            .map(n => {
              if (isTextarea(n)) {
                textareas.push(n)
              } else {
                if(n.querySelectorAll) {
                  var tareas = [].slice.call(n.querySelectorAll('textarea.edit'))
                  textareas = textareas.concat(tareas)
                }
              }
            })
        })

  if (textareas.length !== 0) {
    textareas.map(t => {
      if(editing == t.id.split('-')[2] && field !== null) {
        t.value = field
        t.focus()
      }
      t.oninput = editingInputHandler;
    })
    jQuery(textareas).textareaAutoSize()
  }
});
 
var config = { childList: true, subtree: true };
 
observer.observe(document.body, config);
