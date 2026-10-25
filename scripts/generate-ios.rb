#!/usr/bin/env ruby
# GEM_HOME=/opt/homebrew/Cellar/cocoapods/1.16.2_2/libexec ruby scripts/generate-ios.rb
require 'xcodeproj'
require 'fileutils'
root = File.expand_path('..', __dir__)
ios = File.join(root, 'apps/ios')
project_path = File.join(ios, 'PapuPay.xcodeproj')
project = Xcodeproj::Project.new(project_path)
project.root_object.attributes['LastUpgradeCheck'] = '2600'
project.build_configurations.each do |config|
  config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '17.0'
  config.build_settings['SWIFT_VERSION'] = '5.0'
  config.build_settings['CLANG_ENABLE_MODULES'] = 'YES'
  config.build_settings['ENABLE_USER_SCRIPT_SANDBOXING'] = 'YES'
end
shared = project.main_group.new_group('Shared', 'Shared')
shared_refs = Dir.glob(File.join(ios, 'Shared/*.swift')).map { |p| shared.new_file(File.basename(p)) }
entry_group = project.main_group.new_group('PapuPay', 'PapuPay')
entry = entry_group.new_file('PapuPayApp.swift')
widget_group = project.main_group.new_group('LiveActivity', 'LiveActivity')
widget_ref = widget_group.new_file('PapuLiveActivity.swift')
resources = project.main_group.new_group('Resources', 'Resources')
resource_refs = Dir.glob(File.join(ios, 'Resources/*')).reject { |p| p.end_with?('.txt') }.map { |p| resources.new_file(File.basename(p)) }
app = project.new_target(:application, 'PapuPay', :ios, '17.0')
clip = project.new_target(:application_on_demand_install_capable, 'PapuPayClip', :ios, '17.0')
widget = project.new_target(:app_extension, 'PapuPayLiveActivity', :ios, '17.0')
clip_widget = project.new_target(:app_extension, 'PapuPayClipLiveActivity', :ios, '17.0')

package = project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
package.repositoryURL = 'https://github.com/rive-app/rive-ios'
package.requirement = { 'kind'=>'exactVersion', 'version'=>'6.27.0' }
project.root_object.package_references << package
[app,clip].each do |target|
  target.add_file_references(shared_refs + [entry])
  resource_refs.each { |ref| target.resources_build_phase.add_file_reference(ref) }
  product = project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
  product.package = package
  product.product_name = 'RiveRuntime'
  target.package_product_dependencies << product
  file = project.new(Xcodeproj::Project::Object::PBXBuildFile)
  file.product_ref = product
  target.frameworks_build_phase.files << file
end
[widget,clip_widget].each do |target|
  target.add_file_references([widget_ref,shared_refs.find { |r| r.path == 'PapuOrderAttributes.swift' }])
end
base_id = 'com.papupay.app'
ids = {app=>base_id,clip=>base_id+'.Clip',widget=>base_id+'.LiveActivity',clip_widget=>base_id+'.Clip.LiveActivity'}
ids.each do |target,bundle|
  extension = [widget,clip_widget].include?(target)
  info_path = "#{target.name}-Info.plist"
  entitlements_path = "#{target.name}.entitlements"
  info = {
    'CFBundleDisplayName'=>'PapuPay', 'CFBundleName'=>'$(PRODUCT_NAME)',
    'CFBundleIdentifier'=>'$(PRODUCT_BUNDLE_IDENTIFIER)', 'CFBundleExecutable'=>'$(EXECUTABLE_NAME)',
    'CFBundlePackageType'=>extension ? 'XPC!' : 'APPL',
    'CFBundleShortVersionString'=>'1.0','CFBundleVersion'=>'1',
    'NSSupportsLiveActivities'=>true
  }
  if extension
    info['NSExtension'] = {'NSExtensionPointIdentifier'=>'com.apple.widgetkit-extension'}
  else
    info['UILaunchScreen'] = {}
    info['UIApplicationSceneManifest'] = {'UIApplicationSupportsMultipleScenes'=>false}
    info['UISupportedInterfaceOrientations'] = ['UIInterfaceOrientationPortrait']
    info['UIRequiredDeviceCapabilities'] = ['arm64']
    info['UIAppFonts'] = ['PapuDisplay-Bold.ttf','PapuDisplay-ExtraBold.ttf']
    info['CFBundleURLTypes'] = [{'CFBundleURLName'=>'com.papupay.app','CFBundleURLSchemes'=>['papupay']}]
    info['NSAppClip'] = {'NSAppClipRequestEphemeralUserNotification'=>false,'NSAppClipRequestLocationConfirmation'=>false} if target==clip
  end
  Xcodeproj::Plist.write_to_path(info,File.join(ios,info_path))
  entitlements = {}
  entitlements['com.apple.developer.associated-domains'] = ['appclips:papupay.com'] if [app,clip].include?(target)
  entitlements['com.apple.developer.associated-domains'] << 'applinks:papupay.com' if target==app
  entitlements['com.apple.developer.associated-appclip-app-identifiers'] = ['$(AppIdentifierPrefix)'+ids[clip]] if target==app
  if target==clip
    entitlements['com.apple.developer.on-demand-install-capable'] = true
    entitlements['com.apple.developer.parent-application-identifiers'] = ['$(AppIdentifierPrefix)'+ids[app]]
  end
  entitlements['com.apple.developer.on-demand-install-capable'] = true if target==clip_widget
  Xcodeproj::Plist.write_to_path(entitlements,File.join(ios,entitlements_path))
  target.build_configurations.each do |config|
    config.build_settings.merge!({
      'PRODUCT_BUNDLE_IDENTIFIER'=>bundle,'INFOPLIST_FILE'=>info_path,'CODE_SIGN_ENTITLEMENTS'=>entitlements_path,
      'CODE_SIGN_STYLE'=>'Automatic','DEVELOPMENT_TEAM'=>ENV.fetch('PAPUPAY_DEVELOPMENT_TEAM','5W4JVD497D'),
      'SWIFT_VERSION'=>'5.0','IPHONEOS_DEPLOYMENT_TARGET'=>'17.0','TARGETED_DEVICE_FAMILY'=>'1',
      'MARKETING_VERSION'=>'1.0','CURRENT_PROJECT_VERSION'=>'1',
      'ENABLE_BITCODE'=>'NO','GENERATE_INFOPLIST_FILE'=>'NO',
      'LD_RUNPATH_SEARCH_PATHS'=>['$(inherited)','@executable_path/Frameworks', '@executable_path/../../Frameworks'],
      'ASSETCATALOG_COMPILER_APPICON_NAME'=>extension ? '' : 'AppIcon',
      'SUPPORTED_PLATFORMS'=>'iphoneos iphonesimulator','SUPPORTS_MACCATALYST'=>'NO',
      'SUPPORTS_MAC_DESIGNED_FOR_IPHONE_IPAD'=>'NO','SWIFT_EMIT_LOC_STRINGS'=>'YES',
      'SKIP_INSTALL'=>target==app ? 'NO' : 'YES'
    })
    config.build_settings['APPLICATION_EXTENSION_API_ONLY'] = 'YES' if extension
    if config.name == 'Release'
      config.build_settings['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
      config.build_settings['DEAD_CODE_STRIPPING'] = 'YES'
      config.build_settings['STRIP_INSTALLED_PRODUCT'] = 'YES'
      config.build_settings['COPY_PHASE_STRIP'] = 'YES'
    end
  end
end
[[app,widget],[clip,clip_widget]].each do |host,ext|
  host.add_dependency(ext)
  phase = host.new_copy_files_build_phase('Embed App Extensions')
  phase.dst_subfolder_spec = '13'
  phase.add_file_reference(ext.product_reference).settings = {'ATTRIBUTES'=>['RemoveHeadersOnCopy']}
end
app.add_dependency(clip)
phase=app.new_copy_files_build_phase('Embed App Clips')
phase.dst_subfolder_spec='16'
phase.dst_path='$(CONTENTS_FOLDER_PATH)/AppClips'
phase.add_file_reference(clip.product_reference).settings={'ATTRIBUTES'=>['RemoveHeadersOnCopy']}
project.save
[app,clip].each do |target|
  scheme = Xcodeproj::XCScheme.new
  scheme.add_build_target(target)
  scheme.set_launch_target(target)
  scheme.launch_action.build_configuration = 'Debug'
  scheme.archive_action.build_configuration = 'Release'
  if target==clip
    vars=REXML::Element.new('EnvironmentVariables')
    vars.add_element('EnvironmentVariable',{'key'=>'_XCAppClipURL','value'=>'https://papupay.com/go/koszyki/24','isEnabled'=>'YES'})
    scheme.launch_action.xml_element.add_element(vars)
  end
  scheme.save_as(project_path,target.name,true)
end
puts "Generated #{project_path} (app, App Clip, and two Live Activity extensions)"
