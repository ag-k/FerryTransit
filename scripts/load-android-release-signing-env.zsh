#!/bin/zsh

if [[ "${ZSH_EVAL_CONTEXT:-}" != *:file ]]; then
  print -u2 -- "このスクリプトは実行せず、現在のシェルで source してください。"
  print -u2 -- "使用例: source scripts/load-android-release-signing-env.zsh"
  exit 2
fi

_ferrytransit_load_android_release_signing_env() {
  setopt local_options no_xtrace

  local keystore_path="${HOME}/Library/Application Support/FerryTransit/keys/ferrytransit-upload-2026.jks"
  local key_alias="ferrytransit-upload-2026"
  local keychain_account="${FERRYTRANSIT_ANDROID_KEYCHAIN_ACCOUNT:-${USER:-}}"
  local security_bin="${FERRYTRANSIT_SECURITY_BIN:-/usr/bin/security}"
  local keystore_service="FerryTransit Android Keystore Password"
  local key_service="FerryTransit Android Key Password"
  local keystore_password
  local key_password

  unset FERRYTRANSIT_ANDROID_KEYSTORE_PATH
  unset FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD
  unset FERRYTRANSIT_ANDROID_KEY_ALIAS
  unset FERRYTRANSIT_ANDROID_KEY_PASSWORD

  if [[ ! -f "$keystore_path" ]]; then
    print -u2 -- "Keystoreが見つかりません: $keystore_path"
    return 1
  fi
  if [[ -z "$keychain_account" ]]; then
    print -u2 -- "キーチェーン検索に使うアカウント名を特定できません。"
    return 1
  fi
  if [[ ! -x "$security_bin" ]]; then
    print -u2 -- "securityコマンドが見つかりません: $security_bin"
    return 1
  fi

  keystore_password="$(
    "$security_bin" find-generic-password \
      -a "$keychain_account" \
      -s "$keystore_service" \
      -w 2>/dev/null
  )" || {
    print -u2 -- "キーチェーン項目「$keystore_service」を読み込めません。"
    return 1
  }

  key_password="$(
    "$security_bin" find-generic-password \
      -a "$keychain_account" \
      -s "$key_service" \
      -w 2>/dev/null
  )" || {
    print -u2 -- "キーチェーン項目「$key_service」を読み込めません。"
    return 1
  }

  if [[ -z "$keystore_password" || -z "$key_password" ]]; then
    print -u2 -- "キーチェーンから空のパスワードが返されました。"
    return 1
  fi

  typeset -gx FERRYTRANSIT_ANDROID_KEYSTORE_PATH="$keystore_path"
  typeset -gx FERRYTRANSIT_ANDROID_KEYSTORE_PASSWORD="$keystore_password"
  typeset -gx FERRYTRANSIT_ANDROID_KEY_ALIAS="$key_alias"
  typeset -gx FERRYTRANSIT_ANDROID_KEY_PASSWORD="$key_password"

  print -- "Androidリリース署名用の環境変数4項目を設定しました。"
}

_ferrytransit_load_android_release_signing_env
_ferrytransit_status=$?
unfunction _ferrytransit_load_android_release_signing_env
return $_ferrytransit_status
