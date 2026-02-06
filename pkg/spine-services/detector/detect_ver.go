package detector

import (
	"io"
	"os"
	"regexp"
)

//Covers "spine":"3.8.99", "spine": "4.1", and raw binary strings
var versionRegex = regexp.MustCompile(`(?i)spine["\s:]+([3-4]\.[0-9](\.[0-9]{1,2})?)`)

func DetectVersion(path string, isBinary bool) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	//Handle files with headers/wrappers
	buffer := make([]byte, 65536)
	n, err := f.Read(buffer)
	if err != nil && err != io.EOF {
		return "", err
	}
	data := buffer[:n]

	//Check for skeleton binary
	if len(data) > 10 {
		strLen := int(data[8]) - 1
		if strLen > 0 && strLen < 15 && 9+strLen <= len(data) {
			potentialVer := string(data[9 : 9+strLen])
			if versionRegex.MatchString(potentialVer) {
				return potentialVer, nil
			}
		}
	}

	//Check for json
	matches := versionRegex.FindSubmatch(data)
	if len(matches) > 1 {
		return string(matches[1]), nil
	}

	simpleVer := regexp.MustCompile(`([3-4]\.[0-9]\.[0-9]{1,2})`)
	fallback := simpleVer.Find(data)
	if fallback != nil {
		return string(fallback), nil
	}

	return "unknown", nil
}