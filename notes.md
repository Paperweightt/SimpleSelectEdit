# axis colors

- x - red - #f15d6e
- y - green - #51af35
- z - blue - #009bff
- c - purple - #b771e9

# priority system

1. screen
2. core
3. arrows
4. gizmos
5. selection
6. entities
7. blocks

## drag

2. core
3. arrows
4. gizmos
5. entities
6. blocks

## click

1. screen
2. selection

# todo

## test

- [ ] custom block display with item display entity

## major bugs

- [ ] structure max size causes issue with rotation and flip with large inputs
- [ ] reload interrupt undo doesnt remove ticking area

## minor bugs

- [ ] mob head display in fill
- [ ] selection creator doesnt have a bounding box
- [ ] player interactable entities priority with other player's interactable entities not organized

## implement

- [ ] grid snapping during iteractions
- [ ] clear button for fill

## implement later

- [ ] sounds (inv no space save as)
- [ ] water and lava fill
- [ ] use shearing to make any rotation work
- [ ] tp entities with box
- [ ] organize undo history by date

## consider

- [ ] clamp out ugly colors / re-randomize
- [ ] is viewing / grabbable indicator
- [ ] make rotations stable using non-rounded bounding boxes
- [ ] magic select (smart flood fill)
- [ ] ignore air on all edits

## too much effort / not worth

- [ ] perfectly accurate true pivot rotation
- [ ] fix panel 2 axis rotation
- [ ] entity based outline
- [ ] menu for mobile
- [ ] arrows are invisible to people that dont own that box (entities will still obstruct placement)

## done

- [x] delete & undo should close menu
- [x] save as with full player inventory
- [x] punch to switch between rotate, move, resize
- [x] group creation works while looking the opposite direction in 3rd person
- [x] nice rotation animation + interactable rotate entities
- [x] item display below world
- [x] remove delete button from menu
- [x] 7 ui
- [x] select owned box causes error
- [x] undo create selection bugs out with owned selections
- [x] blueprint item
- [x] create box doesnt have undo
- [x] kill @e fix
- [x] you can drag the menu entities
- [x] test undo other players work
- [x] player leave while they own a selection group
- [x] axis color
- [x] undo item
- [x] delete tool with someone elses selection group
- [x] cant increase y size at bottom of world
- [x] doesnt release the change type when change = 0
- [x] drag entities
- [x] core offset on pickup
- [x] player can move and resize at the same time
- [x] arrow drag along plane
- [x] move things from behind
- [x] arrow hitboxes
- [x] core hitbox
- [x] perfect rotate undo
- [x] perfect flip undo
- [x] add distance to player limit
- [x] bad screen spawn location
- [x] back panel
- [x] prioritize center core over arrows
- [x] undo size change
- [x] deselect broke
- [x] ownership system
- [x] bottom fix
- [x] owner color
