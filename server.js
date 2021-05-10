const chokidar = require("chokidar");
const express = require("express");
const fs = require("fs").promises;
const marked = require("marked");

const file = process.argv[3] || "test.md";
const app = express();
const watchers = new Set();
let html;

chokidar.watch(file).on("all", async (evt, path, stats) => {
  html = marked((await fs.readFile(path)).toString());

  for (const res of watchers) {
    res.write(html);
  }
});

app.get("/stream", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
  });
  res.flushHeaders();
  res.write(html);
  watchers.add(res);
  res.on("close", () => {
    watchers.delete(res);
    res.end();
  });
});

app.get("/", (request, response) => {
  const html =
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${file}</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/4.0.0/github-markdown.min.css" integrity="sha512-Oy18vBnbSJkXTndr2n6lDMO5NN31UljR8e/ICzVPrGpSud4Gkckb8yUpqhKuUNoE+o9gAb4O/rAxxw1ojyUVzg==" crossorigin="anonymous" />
  <style>

.markdown-body {
  box-sizing: border-box;
  min-width: 200px;
  max-width: 980px;
  margin: 0 auto;
  padding: 45px;
}

@media (max-width: 767px) {
  .markdown-body {
    padding: 15px;
  }
}

  </style>
</head>
<body>
<script>

(async () => {
  const response = await fetch("/stream");

  if (!response.ok) {
    throw Error(response.status());
  }

  for (const reader = response.body.getReader();;) {
    const {value, done} = await reader.read();
  
    if (done) {
      break;
    }
  
    document.body.innerHTML = '<article class="markdown-body">' + 
      new TextDecoder().decode(value) + '</article>'
    ;
  }
})();

</script>
</body>
</html>`;
  response.send(html);
});

const listener = app.listen(process.env.PORT || 3000, () =>
  console.log(`Your app is listening on port ${listener.address().port}`)
);

