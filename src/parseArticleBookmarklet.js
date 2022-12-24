/**
 * Bookmarklet by tikkun olam, motherfuckers & Saragossa Manuscript
 * Analyzes an article's metadata (title, url, provider, and description), copying it to the clipboard in a comment-ready format. 
 * Note that the 'description' text will be the currently selected (highlighted) text on the page, if any is detected.
**/

(function () {
  function makeUrlAbsolute(base, relative) {
    return new URL(relative, base).href;
  }
  function parseUrl(url) {
    return new URL(url).host;
  }
  function getProvider(host) {
    return host.replace(/www[a-zA-Z0-9]*\./, '').replace('.co.', '.').split('.').slice(0, -1).join(' ');
  }
  function buildRuleSet(ruleSet) {
    return (doc, context) => {
      let maxScore = 0;
      let maxValue;
      for (let currRule = 0; currRule < ruleSet.rules.length; currRule++) {
        const [query, handler] = ruleSet.rules[currRule];
        const score = ruleSet.rules.length - currRule;
        let value;

        if (query) {
          const elements = Array.from(doc.querySelectorAll(query));
          if (elements[0]) {
            value = handler(elements[0])
          }
        } else {
          value = handler()
        }
        
        if (score > maxScore || !maxValue) {
          maxScore = score;
          maxValue = value;
        }
      }

      if (!maxValue && ruleSet.defaultValue) {
        maxValue = ruleSet.defaultValue(context);
      }

      if (maxValue) {
        if (ruleSet.processors) {
          for (const processor of ruleSet.processors) {
            maxValue = processor(maxValue, context);
          }
        }
        if (maxValue.trim) {
          maxValue = maxValue.trim();
        }

        return maxValue;
      }
    };
  }

  const metadataRuleSets = {
    description: {
      rules: [
        [
          null,
          () => {
            let selection = document.getSelection()
            if (!selection) return ''
            else return selection.toString()
          }
        ],
        [
          'meta[property ="og:description"]',
          element => element.getAttribute('content')
        ],
        [
          'meta[name ="description" i]',
          element => element.getAttribute('content')
        ],
      ],
    },
    title: {
      rules: [
        [
          'meta[property ="og:title"]',
          element => element.getAttribute('content')
        ],
        [
          'meta[name ="twitter:title"]',
          element => element.getAttribute('content')
        ],
        [
          'meta[property ="twitter:title"]',
          element => element.getAttribute('content')
        ],
        [
          'meta[name ="hdl"]',
          element => element.getAttribute('content')
        ],
        [
          'title', element => element.text
        ],
      ],
    },
    url: {
      rules: [
        [
          'link[rel ="canonical"]',
          element => element.getAttribute('href')
        ],
        [
          'meta[property ="og:url"]',
          element => element.getAttribute('content')
        ],
      ],
      defaultValue: (context) =>
        context.url,
      processors: [
        (url, context) => makeUrlAbsolute(context.url, url)
      ]
    },
    provider: {
      rules: [
        [
          'meta[property ="og:site_name"]',
          element => element.getAttribute('content')
        ],
        [
          'meta[property ="twitter:site"]',
          element => element.getAttribute('content')
        ],
      ],
      defaultValue: (context) => getProvider(parseUrl(context.url))
    },
  };

  function getMetadata(doc, url) {
    const metadata = {};
    const context = { url };

    Object.keys(metadataRuleSets).map(ruleSetKey => {
      const ruleSet = metadataRuleSets[ruleSetKey];
      const builtRuleSet = buildRuleSet(ruleSet);
      metadata[ruleSetKey] = builtRuleSet(doc, context);
    });

    return metadata;
  }

  function formatMetadata(doc, url) {
    let metadata = getMetadata(doc, url);
    return `<a href ="${metadata.url}">(<strong>${metadata.provider}</strong>) ${metadata.title}</a><blockquote>"${metadata.description}"</blockquote>`;
  }

  function copy(text) {
    var node = document.createElement('textarea');
    var selection = document.getSelection();
    node.textContent = text;
    document.body.appendChild(node);
    selection.removeAllRanges();
    node.select();
    document.execCommand('copy');
    selection.removeAllRanges();
    document.body.removeChild(node);
  }

  copy(formatMetadata(document, document.location.href))
})()