package load

import (
	"fmt"
	"path/filepath"

	"cuelang.org/go/cue"
	"cuelang.org/go/cue/load"
	"github.com/grafana/grafana/pkg/schema"
)

// Families can have variants, where more typing information narrows the
// possible values for certain keys in schemas. These are a meta-property
// of the schema, effectively encoded in these loaders.
//
// We can generally define three variants:
//  - "Base": strictly core schema files, no plugins. (go:embed-able)
//  - "Dist": "Base" + plugins that ship with vanilla Grafana (go:embed-able)
//  - "Instance": "Dist" + the non-core plugins available in an actual, running Grafana

// BaseLoadPaths contains the configuration for loading a DistDashboard
type BaseLoadPaths struct {
	// BaseCueFS should be rooted at a directory containing the filesystem layout
	// expected to exist at github.com/grafana/grafana/cue.
	BaseCueFS string

	packageName string

	// DistPluginCueFS should point to some fs path (TBD) under which all core
	// plugins live.
	DistPluginCueFS string

	// InstanceCueFS should point to a root dir in which non-core plugins live.
	// Normal case will be that this only happens when an actual Grafana
	// instance is making the call, and has a plugin dir to offer - though
	// external tools could always create their own dirs shaped like a Grafana
	// plugin dir, and point to those.
	InstanceCueFS string
}

var buildFamilyFunc = BuildDashboardFamily

// BuildDashboardFamily read from cue file and build schema.Family go object
func BuildDashboardFamily(fam *schema.Family, famval cue.Value) (*schema.Family, error) {
	majorVersionArray := famval.Lookup("seqs")
	if !majorVersionArray.Exists() {
		return fam, fmt.Errorf("seqs field has to exist in cue definition")
	}

	majorVerstionIte, err := majorVersionArray.List()
	if err != nil {
		return fam, err
	}

	major := 0
	for majorVerstionIte.Next() {
		minor := 0
		var majorseq schema.Seq
		minorVersionIte, err := majorVerstionIte.Value().List()
		if err != nil {
			return fam, err
		}
		for minorVersionIte.Next() {
			fmt.Printf("<<<<<<<<<<<<<<<<<<<<<<<<<<<<< %v+", minorVersionIte.Value())
			vcs := schema.NewVersionedCueSchema(minorVersionIte.Value(), major, minor)
			majorseq = append(majorseq, *vcs)
			minor++
		}
		fam.Seqs = append(fam.Seqs, majorseq)
		major++
	}
	return fam, nil
}

// BaseDashboard creates a schema.Family that correponds to all known
// core-only dashboard schemata in this version of Grafana.
func BaseDashboard(p BaseLoadPaths) (*schema.Family, error) {
	// TODO deal with making sure we're using the same cue.Runtime everywhere

	// TODO see if we can trick load.Instances into using our io.FS. If not, we'll
	// probably have to use cue.Runtime directly. The loss there, i think, would
	// be the default `cue` behavior for loading packages in ancestor dirs, all files
	// of the same package in a dir, etc. We could minimize the cost by keeping our
	// on-disk filesystem structures simple.
	testdataDir := filepath.Join(p.BaseCueFS, "data")
	dirCfg := &load.Config{
		Dir:     testdataDir,
		Package: p.packageName,
		Tools:   true,
	}

	SchemaInstances := load.Instances([]string{"."}, dirCfg)
	// Select the dashboard schema Value from the instance path at which we have
	// defined it to live.
	// TODO ugh, we need to fully define the schema family pattern to pull out the current dashboard
	fam := &schema.Family{}
	var err error
	insts := cue.Build(SchemaInstances)
	for _, l := range insts {
		famval := l.Lookup("dashboardFamily")
		if famval.Exists() == true {
			fam, err = buildFamilyFunc(fam, famval)
			return fam, err
		}
	}
	return fam, nil
	// TODO Iterate over seqs in famval, create corresponding CueSchema on fam
}

// ---
// RANDOM NOTES ABOUT PAINFUL SHIT

// There will exist cases where artifacts that are valid with respect to an
// on-seq schema will have problems migrating to the next schema, whether or not
// it's in the next seq. This is particularly likely to occur if a schema has
// been underspecified - as we expect many initially will - and the author wants
// to get more precise in subsequent schema versions.
//
// For example, say an author initially specifies a particular sub-field
// in their schema to be "{}", meaning that any struct/object will unify and
// therefore pass validation.
//
// schema1: {
//   subfield: {}
// }
//
// Then, say a subsequent version of the same schema adds required fields to
// that formerly-empty subfield, including default values (as required by backwards
// compatibility rules).
//
// schema2: {
//   subfield: {
//     foo: string | *"ohai"
//   }
// }
//
// Such field additions aren't *necessarily* a problem. But if a) the new
// schema's added fields actually did existed in artifacts that were valid for
// previous versions of the schema, and b) there was variation in the naming or
// structure of those fields that was previously handled by frontend migration
// logic, then the new version of the schema can capture at most one of those
// variations. If a variation not covered by the schema is encountered, it will
// pass validation thanks to the new field's default value, but the user will
// consider it to be erroneous, as default values will have been applied where
// user intent "should" have been honored.
//
// artifacts2: {
//   subfield: {
//     bar: "ohai" // the contents of bar should properly be writen in foo
//   }
// }
//
// There isn't really a lot we can do about this within the bounds of this
// system. Designing even more intermediate structures would be really complex.
// It's best to accept this as a limitation entailed by CUE's fundamental
// constraints, and lean on docs and education to help avoid authors from
// creating such situations in the first place.

// When creating schema, it's easiest to express conditionally required fields
// by encapsulating the interrelated fields within its own struct. This way,
// the overall field can be made optional, but if present, its subfields may be
// required.
//
// Even this strategy doesn't scale terribly well, though. Where possible, one
// should avoid creating large, deeply nested conditional structures by instead
// erring on the side of making a conditional field required and giving it a
// default value, then ensuring that the mere presence of the field does not
// change behavior in consumers of the schema.
