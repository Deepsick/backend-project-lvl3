### Hexlet tests and linter status:
[![Actions Status](https://github.com/Deepsick/backend-project-lvl3/workflows/hexlet-check/badge.svg)](https://github.com/Deepsick/backend-project-lvl3/actions)
[![Node CI](https://github.com/Deepsick/backend-project-lvl3/workflows/Node%20CI/badge.svg)](https://github.com/Deepsick/backend-project-lvl3/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/58ef05abe9d15be44ea7/maintainability)](https://codeclimate.com/github/Deepsick/backend-project-lvl3/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/58ef05abe9d15be44ea7/test_coverage)](https://codeclimate.com/github/Deepsick/backend-project-lvl3/test_coverage)

# Page-loader

Make request to url, download page and its resources


## Installation

NodeJs packaging and dependency management tool ```npm``` should be preinstalled.

### Local
```bash
make install
```

### Global
```bash
make link
```

## Usage

```bash
Usage: page-loader [options] <url>

Downloads html page with all its resources.

Options:
  -V, --version        output the version number
  -o, --output [path]  output folder path (default: ".")
  -h, --help           display help for command
```

### Downloading a page

[![asciicast](https://asciinema.org/a/1OgLWeQkK2nHrS9Im3bwbOAQV.svg)](https://asciinema.org/a/1OgLWeQkK2nHrS9Im3bwbOAQV)

### Logging

[![asciicast](https://asciinema.org/a/SqNkrcHPWUTteobZlascf0wgp.svg)](https://asciinema.org/a/SqNkrcHPWUTteobZlascf0wgp)

## Testing

```bash
make install
make lint
make test
```


## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.


## License

[MIT](https://choosealicense.com/licenses/mit/)