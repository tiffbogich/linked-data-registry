var views = exports;
var modules = require("./modules.js");

views.lib = {
  semver: modules.semver,
  paddedSemver: modules['padded-semver'].replace("require('semver')", "require('views/lib/semver')", 'g'),  //discusting hack...
  punycode: modules['punycode'],
  querystring: modules['querystring'],
  'is-url': modules['is-url'],
  url: modules['url']
    .replace("require('punycode')", "require('views/lib/punycode')", 'g')
    .replace("require('querystring')", "require('views/lib/querystring')", 'g'),
  'for-each-node': modules['for-each-node']
};

views.byId = {
  map: function(doc){
    var edoc = {
      _id: doc._id,
      '@id': doc['@id']
    };
    if (doc['@type']) edoc['@type'] = doc['@type'];
    if (doc.version) edoc.version = doc.version;

    emit(doc['@id'].split(':')[1], edoc);
  },
  reduce: '_count'
};

views.byIdAndVersion = {
  map: function(doc){
    var id = doc['@id'].split(':')[1];

    var version;
    if ('version' in doc) {
      var semver = require('views/lib/semver');
      if (semver.valid(doc.version) ) {
        var paddedSemver = require('views/lib/paddedSemver');
        version = paddedSemver.pad(doc.version);
      } else {
        version = doc.version;
      }
    } else {
      version = id;
    }

    emit([id, version], {
      _id: doc._id,
      '@id': doc['@id'],
      version: version
    });

  },
  reduce: '_count'
};


/**
 * used to know if we can delete the resource with sha-1
 */
views.bySha1 = {
  map: function(doc){
    var isUrl = require('views/lib/is-url');
    var url = require('views/lib/url');
    var forEachNode = require('views/lib/for-each-node');

    function _getSha1(uri){
      var pathName;
      var splt = uri.split(':');

      if (isUrl(uri)) {
        purl = url.parse(uri);
        if (purl.hostname === 'registry.standardanalytics.io') {
          pathname = purl.pathname;
        }
      } else if (splt.length === 2 && splt[0] === 'sa') {
        pathName = splt[1];
      }

      if (pathName) {
        var spn = pathName.replace(/^\/|\/$/g, '').split('/');
        if (spn.length === 2 && spn[0] === 'r') {
          return spn[1];
        }
      }
    };

    function _emit(prop, node){
      ['downloadUrl', 'installUrl', 'contentUrl', 'embedUrl'].forEach(function(x){
        if (node[x]) {
          var sha1 = _getSha1(node[x]);
          if (sha1) {
            emit(sha1, { _id: doc._id, '@id': doc['@id'] } );
          }
        }
      });
    };

    _emit(null, doc);
    forEachNode(doc, _emit);
  },
  reduce: '_count'
};
