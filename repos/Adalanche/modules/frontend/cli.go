package frontend

import (
	"fmt"
	"os/exec"
	"runtime"
	"runtime/debug"

	"github.com/KimMachineGun/automemlimit/memlimit"
	"github.com/lkarlslund/adalanche/modules/cli"
	"github.com/lkarlslund/adalanche/modules/ui"
	"github.com/spf13/cobra"
	_ "go.uber.org/automaxprocs"
)

var (
	Command = &cobra.Command{
		Use:   "analyze [-options]",
		Short: "Lanunches the interactive discovery tool in your browser",
	}

	// memlimits   = Command.Flags().Int64("memlimits", 0, "Memory limits for the analysis (in MB)")
	bind        = Command.Flags().String("bind", "127.0.0.1:8080", "Address and port of webservice to bind to")
	noBrowser   = Command.Flags().Bool("nobrowser", false, "Don't launch browser after starting webservice")
	localHTML   = Command.Flags().StringSlice("localhtml", nil, "Override embedded HTML and use a local folders for webservice (for development)")
	certificate = Command.Flags().String("certificate", "", "Path to or complete certificate file in PEM format")
	privateKey  = Command.Flags().String("privatekey", "", "Path to or complete private key in PEM format")
)

func init() {
	cli.Root.AddCommand(Command)
	if Command.RunE == nil { // Avoid colliding with enterprise version
		Command.RunE = Execute
	}
	Command.Flags().Lookup("localhtml").Hidden = true
}

func Execute(cmd *cobra.Command, args []string) error {
	datapath := *cli.Datapath

	memlimit.SetGoMemLimit(0.9)
	debug.SetGCPercent(1000)

	cpus := runtime.GOMAXPROCS(-1)
	runtime.GOMAXPROCS(cpus * 8 / 10)

	if *certificate != "" && *privateKey == "" {
		AddOption(WithCert(*certificate, *privateKey))
	}

	// allow debug runs to use local paths for html
	for _, localhtmlpath := range *localHTML {
		AddOption(WithLocalHTML(localhtmlpath))
	}

	// Fire up the web interface with incomplete results
	ws := NewWebservice()

	err := ws.Start(*bind)
	if err != nil {
		return err
	}

	// Launch browser
	if !*noBrowser {
		var err error
		url := ws.protocol + "://" + *bind
		switch runtime.GOOS {
		case "linux":
			err = exec.Command("xdg-open", url).Start()
		case "windows":
			err = exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start()
		case "darwin":
			err = exec.Command("open", url).Start()
		default:
			err = fmt.Errorf("unsupported platform")
		}
		if err != nil {
			ui.Warn().Msgf("Problem launching browser: %v", err)
		}
	}

	err = ws.Analyze(datapath)
	if err != nil {
		return err
	}

	// Wait for webservice to end
	<-ws.QuitChan()
	return nil
}
