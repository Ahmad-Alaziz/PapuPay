# Sweeto tasting plate

The [editable Rive document](https://editor.rive.app/file/untitled/2753732) contains the `Sweeto Tasting Dial` artboard. Its default state machine uses the `Tasting Dial` view model. `Turn` is measured in degrees and `Press` is a percentage with a resting value of 100.

The app owns the active flavour and renders the corresponding approved menu photo. The plate follows the guest’s drag and settles at each of the four positions. Tapping the labelled flavour controls uses the same selection logic. Guests can choose and add a dessert with Reduce Motion enabled or while Rive loads.

Export just the tasting artboard into `runtime/sweeto-tasting-dial.riv` and leave the other artboards enabled in the editable master when finished. Verify the default pose, a quarter turn and a press in the target runtime after replacing the export.
