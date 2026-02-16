package update

import (
	"io"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type ProgressReader struct {
	io.Reader
	Total   int64
	Current int64
	u       *UpdaterService
}

func (pr *ProgressReader) Read(p []byte) (int, error) {
    n, err := pr.Reader.Read(p)

    if n > 0 {
        pr.Current += int64(n)

        if pr.Total > 0 {
            newPercentage := float64(pr.Current) / float64(pr.Total) * 100

            if int(newPercentage) > int(float64(pr.Current-int64(n))/float64(pr.Total)*100) {
                runtime.EventsEmit(pr.u.ctx, "update_progress", int(newPercentage))
            }
        }
    }
    return n, err
}
