with import <nixpkgs> {};

stdenv.mkDerivation {
  name = "nixos.org-homepage";

  postHook = "unset http_proxy"; # hack for nix-shell

  buildInputs =
    [ python
      gcc
      electron
    ];
}
